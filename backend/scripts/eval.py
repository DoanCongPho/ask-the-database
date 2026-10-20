"""Run the eval question set against the live LLM + DB and print what the app would answer.

Usage (from backend/):  .venv/bin/python -m scripts.eval [--show-sql]
Re-run after every prompt change; status mismatches are listed at the end.
"""

import json
import sys
from pathlib import Path

from app import db, pipeline

QUESTIONS = json.loads((Path(__file__).parent / "eval_questions.json").read_text(encoding="utf-8"))


def as_history(r: dict) -> list[dict]:
    """Same shape the frontend sends (src/routes/index.tsx toHistory)."""
    answers = r["parts"] if r["status"] == "multi" and r.get("parts") else [r]
    return [{
        "question": a["question"], "sql": a.get("sql"), "status": a["status"],
        "answer": a.get("summary") or a.get("message"), "options": a.get("options") or [],
        "columns": [c["name"] for c in a.get("columns") or []], "rows": (a.get("rows") or [])[:5],
    } for a in answers]


def main(show_sql: bool) -> int:
    db.pool.open(wait=True, timeout=5)
    misses = []
    for i, item in enumerate(QUESTIONS, 1):
        r = pipeline.ask(item["q"], item.get("history", []))
        label = item["q"]
        if item.get("followup") and r["status"] in {"ok", "clarify", "multi"}:
            r = pipeline.ask(item["followup"], as_history(r))
            label += f"  →  {item['followup']}"
        mark = "✓" if r["status"] == item["expect"] else "✗"
        extra = r.get("summary") or r.get("message") or ""
        if r["status"] == "clarify":
            extra += "  " + " | ".join(r["options"])
        retries = len(r.get("attempts") or []) - 1
        print(f"{mark} {i:2}. [{r['status']:<7}] rows={r['row_count']:<4} retries={max(retries, 0)} {r['elapsed_ms']:>5}ms  {label}")
        print(f"       {extra}")
        if show_sql and r.get("sql"):
            print("       " + r["sql"].replace("\n", "\n       "))
        if r["status"] != item["expect"]:
            misses.append(f"{item['q']}: expected {item['expect']}, got {r['status']} ({r.get('message') or ''})")
    print(f"\n{len(QUESTIONS) - len(misses)}/{len(QUESTIONS)} matched the expected status")
    for m in misses:
        print("  ✗", m)
    return 1 if misses else 0


if __name__ == "__main__":
    sys.exit(main("--show-sql" in sys.argv))
