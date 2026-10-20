"""Question -> classify/SQL (LLM) -> validate -> run read-only -> retry on error -> format."""

import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
from psycopg_pool import PoolTimeout

from . import db, llm
from .config import settings
from .formatting import build_columns, pick_chart
from .prompt import SUMMARY_PROMPT, build_messages
from .i18n import detect_lang, norm_lang, t
from .schema_info import schema_info
from .safety import InvalidSQL, UnsafeSQL, check_sql

log = logging.getLogger("pipeline")

_profile_cache: str | None = None




def data_profile() -> str:
    """Facts about the data for the prompt (row counts, date range), read from the DB once.

    Raises PoolTimeout / OperationalError when the DB is down, so the caller can stop before calling the LLM.
    """
    global _profile_cache
    if _profile_cache:
        return _profile_cache
    r = db.run_select(
        "SELECT (SELECT COUNT(*) FROM customers), (SELECT COUNT(*) FROM products), (SELECT COUNT(*) FROM orders),"
        " (SELECT MIN(order_date) FROM orders), (SELECT MAX(order_date) FROM orders),"
        " (SELECT MIN(created_at) FROM customers), (SELECT MAX(created_at) FROM customers)"
    )
    c, p, o, first, last, c_first, c_last = r.rows[0]
    _profile_cache = (
        f"- {c} khách hàng, {p} sản phẩm, {o} đơn hàng.\n"
        f"- Đơn hàng từ {first} đến {last}. Không có đơn hàng nào ngoài khoảng này.\n"
        f"- Khách hàng đăng ký từ {c_first} đến {c_last}."
    )
    return _profile_cache


def _date_range_note(lang: str) -> str:
    """Note for the empty state, e.g. 'Dữ liệu đơn hàng có từ 01/01/2025 đến 12/10/2026.'"""
    try:
        r = db.run_select("SELECT MIN(order_date), MAX(order_date) FROM orders")
        first, last = (f"{d[8:10]}/{d[5:7]}/{d[0:4]}" for d in r.rows[0])
        return t("date_range", lang, first=first, last=last)
    except Exception:
        return ""


def _response(question: str, status: str, **fields) -> dict:
    base = {
        "status": status, "question": question, "sql": None, "interpretation": None, "summary": None,
        "message": None, "options": [], "suggestions": [], "steps": [], "columns": [], "rows": [],
        "row_count": 0, "truncated": False, "chart": None, "attempts": [], "error_detail": None, "parts": [], "tables": [],
    }
    base.update(fields)
    return base


def _strings(value, limit: int = 4) -> list[str]:
    return [s.strip() for s in value if isinstance(s, str) and s.strip()][:limit] if isinstance(value, list) else []


_NOT_ADDITIVE = re.compile(r"(price|unit|avg|average|rate|ratio|pct|percent|ty_le|trung_binh)", re.I)


def _stats(columns: list[dict], rows: list[list]) -> dict:
    """Facts over ALL rows, computed here so the summary never counts or sums a sample."""
    stats = {}
    for i, c in enumerate(columns):
        values = [r[i] for r in rows if r[i] is not None]
        if not values:
            continue
        if c["type"] in {"money", "number"}:
            stats[c["name"]] = {"min": min(values), "max": max(values)}
            if not _NOT_ADDITIVE.search(c["name"]):  # a total of unit prices or averages means nothing
                stats[c["name"]]["sum"] = sum(values)
        elif c["type"] in {"date", "month"}:
            stats[c["name"]] = {"min": min(values), "max": max(values)}
        else:
            counts: dict = {}
            for v in values:
                counts[v] = counts.get(v, 0) + 1
            if len(counts) <= 12 and len(counts) < len(values):  # a category, not a list of names
                stats[c["name"]] = {"count_by_value": counts}
    return stats


def _summarize(question: str, columns: list[dict], rows: list[list], truncated: bool, lang: str) -> str | None:
    if not rows:
        return None
    count = {"row_count_at_least": len(rows)} if truncated else {"row_count_exact": len(rows)}
    payload = {"question": question, "answer_language": "English" if lang == "en" else "Vietnamese", **count, "columns": columns,
               # Stats over a cut-off result would look like totals but aren't, so send none.
        "stats": {} if truncated else _stats(columns, rows), "sample_rows": rows[:20]}
    try:
        out = llm.chat_json([
            {"role": "system", "content": SUMMARY_PROMPT},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False, default=str)},
        ])
        summary = out.get("summary")
        return summary.strip() if isinstance(summary, str) and summary.strip() else None
    except llm.LLMError:
        log.warning("summary call failed; answering without a summary", exc_info=True)
        return None


def ask(question: str, history: list[dict], lang: str = "vi") -> dict:
    """`lang` is the UI language: used before the question's language is known, and when it is unclear."""
    started = time.monotonic()
    result = _ask(question.strip(), history, ui_lang=norm_lang(lang))
    result["elapsed_ms"] = int((time.monotonic() - started) * 1000)
    return result


def _ask(question: str, history: list[dict], allow_split: bool = True, ui_lang: str = "vi") -> dict:
    lang = ui_lang
    if not question:
        return _response(question, "error", message=t("empty_question", lang))
    if len(question) > settings.max_question_chars:
        return _response(question, "error", message=t("too_long", lang, n=len(question), max=settings.max_question_chars))

    # Check the DB first (2 s) so a DB outage doesn't cost an LLM call and a long wait.
    if not db.ping():
        return _response(question, "error", message=t("db_down", lang))
    try:
        profile = data_profile()
    except (PoolTimeout, psycopg.OperationalError):
        return _response(question, "error", message=t("db_down", lang))
    detected = detect_lang(question)
    messages = build_messages(question, history, profile, ui_lang, detected)
    attempts: list[dict] = []
    plan: dict = {}

    for attempt in range(settings.max_retries + 1):
        try:
            plan = llm.chat_json(messages)
        except llm.LLMError as e:
            return _response(question, "error", message=e.text(lang), error_detail=e.detail or None, attempts=attempts)

        kind = plan.get("kind")
        lang = detected or norm_lang(plan.get("lang"), ui_lang)  # the question's language
        if kind == "clarify":
            return _response(
                question, "clarify",
                message=plan.get("message") or t("clarify_default", lang),
                options=_strings(plan.get("options")),
            )
        if kind == "info":
            # General questions ("bạn làm được gì?", "có những bảng nào?"). The data description comes
            # from SCHEMA_INFO, not from the model, so it can't invent tables.
            return _response(
                question, "info", tables=schema_info(lang)["tables"],
                message=plan.get("message") or t("info_default", lang),
                suggestions=_strings(plan.get("suggestions")),
            )
        if kind == "refuse":
            reason = plan.get("reason") if plan.get("reason") in {"write_operation", "not_available"} else "not_available"
            return _response(question, "refused", reason=reason, message=plan.get("message"), suggestions=_strings(plan.get("suggestions"), 3))

        if kind == "split":
            parts = _strings(plan.get("parts"), 3)
            if allow_split and len(parts) >= 2:
                return _split(question, history, parts, plan.get("message"), lang)
            plan = {"kind": "split", "parts": parts}  # keep the retry transcript short
            error = 'Câu này chỉ có một ý, không cần tách. Hãy trả lời bằng kind "sql" (hoặc clarify/refuse).'
            log.info("attempt %d: unexpected split %s", attempt + 1, parts)
            messages = messages + [
                {"role": "assistant", "content": json.dumps(plan, ensure_ascii=False)},
                {"role": "user", "content": error},
            ]
            continue

        sql = plan.get("sql")
        if kind != "sql" or not isinstance(sql, str) or not sql.strip():
            error = 'Câu trả lời thiếu "kind" hợp lệ hoặc thiếu "sql".'
        else:
            try:
                safe_sql = check_sql(sql)
                result = db.run_select(safe_sql)
            except UnsafeSQL as e:
                # The model wrote a write/unsafe query even though it should have refused. Never run it, never retry it.
                log.warning("blocked unsafe SQL: %s | %s", e, sql)
                return _response(
                    question, "refused", reason="write_operation", sql=sql,
                    message=t("blocked_write", lang),
                    error_detail=str(e),
                )
            except (psycopg.errors.ReadOnlySqlTransaction, psycopg.errors.InsufficientPrivilege) as e:
                # The database itself blocked a write that got past check_sql.
                log.warning("database blocked a write: %s | %s", e, sql)
                return _response(question, "refused", reason="write_operation", sql=sql,
                                 message=t("db_blocked_write", lang), error_detail=str(e))
            except (PoolTimeout, psycopg.OperationalError) as e:
                if isinstance(e, psycopg.errors.QueryCanceled):
                    return _response(question, "error", sql=sql, attempts=attempts + [{"sql": sql, "error": "timeout"}],
                                     message=t("timeout", lang),
                                     error_detail=str(e))
                return _response(question, "error", sql=sql, message=t("db_down", lang), error_detail=str(e))
            except (InvalidSQL, psycopg.Error) as e:
                error = str(e).strip()
            else:
                attempts.append({"sql": safe_sql, "error": None})
                return _finish(question, plan, safe_sql, result, attempts, lang)
            attempts.append({"sql": sql, "error": error})

        log.info("attempt %d failed: %s", attempt + 1, error)
        messages = messages + [
            {"role": "assistant", "content": json.dumps(plan, ensure_ascii=False)},
            {"role": "user", "content": f"Lỗi: {error}\nHãy sửa và trả lại JSON đầy đủ theo đúng định dạng."},
        ]

    return _response(
        question, "error", sql=attempts[-1]["sql"] if attempts else None, attempts=attempts,
        message=t("gave_up", lang, n=settings.max_retries + 1),
        error_detail=attempts[-1]["error"] if attempts else None, steps=_strings(plan.get("steps")),
    )


def _split(question: str, history: list[dict], parts: list[str], message: str | None, lang: str) -> dict:
    """Answer each independent sub-question with its own query (in parallel), so one bad part
    can't break the others and each result gets its own table, chart and summary."""

    def one(part: str) -> dict:
        try:
            return _ask(part, history, allow_split=False, ui_lang=lang)
        except Exception as e:  # a part must never take the whole answer down
            log.exception("split part failed: %s", part)
            return _response(part, "error", message=t("part_failed", lang), error_detail=type(e).__name__)

    with ThreadPoolExecutor(max_workers=len(parts)) as pool:
        results = list(pool.map(one, parts))
    return _response(question, "multi", parts=results,
                     message=message or t("split_default", lang, n=len(parts)))


def _finish(question: str, plan: dict, sql: str, result: db.QueryResult, attempts: list[dict], lang: str) -> dict:
    columns = build_columns(result.columns, plan.get("columns"))
    common = dict(
        sql=sql, steps=_strings(plan.get("steps")), interpretation=plan.get("interpretation") or None,
        suggestions=_strings(plan.get("suggestions"), 3), columns=columns, attempts=attempts,
    )
    if not result.rows:
        note = _date_range_note(lang)
        return _response(question, "empty", message=f"{t('no_rows', lang)} {note}".strip(), **common)
    return _response(
        question, "ok", rows=result.rows, row_count=len(result.rows), truncated=result.truncated,
        chart=pick_chart(columns, result.rows, plan.get("chart")),
        summary=_summarize(question, columns, result.rows, result.truncated, lang), **common,
    )
