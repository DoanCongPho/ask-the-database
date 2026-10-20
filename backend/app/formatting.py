"""Turn raw query results into the columns/chart shape the frontend renders."""

import re

_MONEY_NAME = re.compile(r"(_vnd$|revenue|spending|spent|amount|price|sales|doanh_thu|chi_tieu|value)", re.I)
_MONTH_NAME = re.compile(r"(^|_)(month|thang)($|_)", re.I)
_ID_NAME = re.compile(r"(^id$|_id$)", re.I)
VALID_TYPES = {"money", "number", "date", "month", "text"}


def _guess_type(name: str, kind: str) -> str:
    if kind == "number":
        if _ID_NAME.search(name):
            return "text"  # ids are labels, not quantities: no thousands separator
        return "money" if _MONEY_NAME.search(name) else "number"
    if kind == "date":
        return "month" if _MONTH_NAME.search(name) else "date"
    return "text"


def _humanize(name: str) -> str:
    return name.replace("_vnd", "").replace("_", " ").strip().capitalize()


def build_columns(db_columns: list[tuple[str, str]], hints: list[dict] | None) -> list[dict]:
    """Merge real column types from Postgres with the LLM's labels/type hints (matched by name)."""
    by_name = {}
    for h in hints or []:
        if isinstance(h, dict) and isinstance(h.get("name"), str):
            by_name[h["name"]] = h
    columns = []
    for name, kind in db_columns:
        hint = by_name.get(name, {})
        guessed = _guess_type(name, kind)
        hinted = hint.get("type")
        # Trust the hint only when it agrees with the real data kind (e.g. never format text as money).
        if hinted in VALID_TYPES and (
            (kind == "number" and hinted in {"money", "number", "text"})
            or (kind == "date" and hinted in {"date", "month"})
            or (kind == "text" and hinted == "text")
        ):
            col_type = hinted
        else:
            col_type = guessed
        label = hint.get("label") if isinstance(hint.get("label"), str) and hint.get("label").strip() else _humanize(name)
        columns.append({"name": name, "label": label, "type": col_type})
    return columns


_NAME_COL = re.compile(r"(^|_)(name|ten)($|_)", re.I)


def _label_column(columns: list[dict]) -> str | None:
    """The text column that names each row (customer/product name), if there is one."""
    texts = [c for c in columns if c["type"] == "text" and not _ID_NAME.search(c["name"])]
    named = [c for c in texts if _NAME_COL.search(c["name"]) or c["label"].lower().startswith("tên")]
    pool = named or texts
    return pool[0]["name"] if pool else None


def pick_chart(columns: list[dict], rows: list[list], hint: dict | None) -> dict | None:
    """Use the LLM's chart hint if it fits the data, else a simple heuristic, else no chart.

    A chart must not hide what the owner asked for: bars are labelled by the row's name
    (customer, product...) when there is one, and with fewer than 3 rows the table is clearer.
    """
    if len(rows) < 3:
        return None
    names = [c["name"] for c in columns]
    numeric = [c["name"] for c in columns if c["type"] in {"money", "number"}]
    types = {c["name"]: c["type"] for c in columns}
    label = _label_column(columns)

    def bar_x(x: str) -> str | None:
        # Bars keyed by a category while a name column exists would hide the names: use the name.
        if types.get(x) != "text":
            return None
        return label if label and x != label and _NAME_COL.search(label) else x

    if isinstance(hint, dict) and hint.get("type") in {"line", "bar"} and hint.get("x") in names:
        ys = [y for y in hint.get("y") or [] if y in numeric and y != hint["x"]]
        if ys and hint["type"] == "line" and types[hint["x"]] in {"date", "month"}:
            return {"type": "line", "x": hint["x"], "y": ys[:3]}
        if ys and hint["type"] == "bar" and len(rows) <= 30 and (x := bar_x(hint["x"])):
            return {"type": "bar", "x": x, "y": ys[:3]}
    if not numeric:
        return None
    first = columns[0]
    if first["type"] in {"date", "month"}:
        y = [n for n in numeric if n != first["name"]][:1]
        return {"type": "line", "x": first["name"], "y": y} if y else None
    if label and len(rows) <= 25:
        return {"type": "bar", "x": label, "y": numeric[:1]}
    return None
