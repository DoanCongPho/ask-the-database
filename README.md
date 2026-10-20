# Hỏi Cửa Hàng — Ask the Database

A web app for a non-technical Vietnamese shop owner. You ask a question in plain words (Vietnamese or English). An LLM writes the SQL, the app runs it **read-only** on PostgreSQL, and the page shows the answer: a one-line summary, then a table or chart. The SQL is collapsed underneath.

The original assignment brief is in [`docs/BRIEF.md`](docs/BRIEF.md). [`docs/PIPELINE.md`](docs/PIPELINE.md) explains how a question is answered, with diagrams.

## How to run

**Needs:** Docker, and an OpenAI API key (or any OpenAI-compatible provider).

```bash
cp backend/.env.example backend/.env   # then set LLM_API_KEY (see below)
docker compose up --build -d           # → http://localhost:3000   (API: http://localhost:8000)
```

This starts 3 containers:
- PostgreSQL, loaded from `seed.sql`, plus a SELECT-only role (`db/readonly_role.sql`).
- The FastAPI backend.
- The frontend.

Other commands:
- **Ports busy?** `FRONTEND_PORT=3001 BACKEND_PORT=8001 docker compose up --build -d`
- **Reset the data:** `docker compose down -v`

### Environment variables (`backend/.env`)

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `LLM_API_KEY` | yes | — | API key for the LLM provider |
| `LLM_BASE_URL` | no | empty = OpenAI | Any OpenAI-compatible endpoint (Gemini, Groq, OpenRouter, Ollama…; examples in `.env.example`) |
| `LLM_MODEL` | no | `gpt-4.1-mini` | Model name |
| `DATABASE_URL` | no | set by Compose | Postgres URL. Use the read-only `shop_reader` role. |
| `MAX_ROWS`, `MAX_RETRIES`, `STATEMENT_TIMEOUT_MS` | no | 1000, 2, 5000 | Row cap, SQL-fix retries, per-query timeout |

The frontend reads `VITE_API_URL` and `VITE_USE_MOCK` at build time (`frontend/.env.example`). `.env` files are gitignored.

### Without Docker

```bash
docker run -d --name shop-db -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop postgres:16
docker exec -i shop-db psql -U postgres -d shop < seed.sql
docker exec -i shop-db psql -U postgres -d shop < db/readonly_role.sql

cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env    # DATABASE_URL=postgresql://shop_reader:shop_reader@localhost:5433/shop
.venv/bin/uvicorn app.main:app --port 8000

cd frontend && bun install && cp .env.example .env && bun run dev   # http://localhost:5173
```

### Tests

```bash
cd backend && .venv/bin/python -m pytest -q tests     # 65 tests, real DB, fake LLM
cd backend && .venv/bin/python -m scripts.eval        # 28 questions against the live LLM
cd frontend && bun run test                           # vitest, including a UI test of conversations
```

## LLM and model

OpenAI **`gpt-4.1-mini`**, through the OpenAI SDK, in JSON mode at temperature 0.
- **Choosing the model:** the client works with any OpenAI-compatible provider, so the model is a one-line change in `.env`.
- **Fallback:** if a model rejects `temperature` (gpt-5, o-series) or JSON mode, the client drops that option and retries.
- **Calls per question:** usually two. The first classifies the question and writes the SQL. The second writes the one-line summary from the result.

## How it works (short)

1. **Decide what kind of question it is.** The LLM returns JSON with one of these kinds:
   - `sql`
   - `clarify` (2–4 options)
   - `refuse` (`write_operation` or `not_available`)
   - `split` (2–3 independent questions, each answered on its own)
   - `info` ("what can you do?")
2. **Never change data. Four independent layers:**
   1. The prompt tells the LLM to refuse writes.
   2. A `sqlglot` validator allows one SELECT only: no write nodes, no `pg_*` functions, only the 4 tables.
   3. The `shop_reader` role has SELECT-only grants.
   4. Every query runs in `SET TRANSACTION READ ONLY` with a 5 s timeout, and the transaction is always rolled back.

   `tests/test_db.py` skips layers 1–2 and shows the DB still refuses a DELETE.
3. **Retry with the error.** If Postgres rejects the SQL, the error goes back to the LLM, up to 2 times. The answer shows "Đã tự sửa sau N lần thử".
4. **Never crash.** Every failure becomes a clear Vietnamese message on the page: DB down, LLM down or bad key, timeout, invalid JSON, empty or too-long question. A global handler always returns JSON.

## Questions 5–8

| # | Question | What the app does | Why |
|---|---|---|---|
| 5 | List all orders from 2024 | Reads "from 2024" as *2024 onwards*. It lists all 700 orders, and the summary says none are from 2024: all are from 2025 onwards. Asking "Đơn hàng **trong năm** 2024" gives the **no results** state with the available range ("Dữ liệu đơn hàng có từ 01/01/2025 đến 12/10/2026"). | "From" is ambiguous in English, and the model flipped between readings across runs. We fixed one rule in the prompt (from/since = onwards; in/năm = only that year), so the answer is stable and the reading is shown on the card. The empty state always names the data's date range, so the owner knows *why* nothing matched. |
| 6 | Show employee salaries | **Refused (not available):** "the data has no employee or salary information", followed by what *is* available and example questions. | Writing SQL against tables that don't exist only produces errors or made-up answers. The model is given the full schema and told to say what exists instead. |
| 7 | Delete all cancelled orders | **Refused (write):** "Tôi chỉ đọc dữ liệu, không thể thay đổi hay xóa", followed by read-only alternatives such as "Danh sách đơn đã hủy". | The prompt refuses it. If a write ever reached the validator or the DB, both would block it too. The order count stays 700 (checked). |
| 8 | What is the best product? | **Please clarify:** "Theo tiêu chí nào?" with options: by revenue, by quantity sold, by number of orders. The owner can click one or type their own answer. | "Best" has several valid meanings that give different answers. For a non-technical owner a confident wrong answer is worse than one quick question. We only ask when the *metric* is unclear. Things with a sensible default are not asked: no date means all data, no N means top 5, and the default is stated on the card. |

## UI ideas and why

The owner can't read SQL, so the page is built around plain Vietnamese and trust:

- **Vietnamese everywhere**, including answers to English questions. Money is shown as `1,234,000 ₫`, dates as `dd/MM/yyyy`, months as `Tháng 10/2025`.
- **A one-line summary first**, then the table or chart. The SQL is collapsed ("Xem truy vấn SQL"). The brief wants SQL visible but not in the way.
- **"Xem cách tôi tìm câu trả lời":** the AI's steps in plain words, plus a "Lưu ý" line with any assumption it made. This lets the owner catch an answer that *looks* right but answered a different question.
- **Refine in plain words instead of editing SQL.** Every answer has suggestion chips and a box ("chỉ năm 2026", "xem top 10"). These are sent as follow-ups with the previous question, SQL and first rows. We built this instead of "Edit SQL", because the owner can't write SQL.
- **Ask, don't guess.** The clarify card has clickable options plus a free-text answer.
- **Multi-part questions are split.** "Top customer *and* top product" is answered as two parts, each with its own query, table and chart. One combined query was fragile and produced misleading charts.
- **Conversations.** "Cuộc trò chuyện mới" starts a fresh context. Earlier conversations stay in the sidebar (session history) and can be reopened.
- **Charts only when they help.** A line chart for time series. A bar chart for at most 25 named rows, always labelled by the name (customer or product). No chart under 3 rows.
- **Honest summaries.** Counts and totals are computed in code over *all* rows, not by the LLM from a sample. A cut-off result says "ít nhất N".
- **Large results:** a sortable, paginated table capped at 1,000 rows, with a "showing the first 1,000" note. Plus copy-table and CSV export.
- **Every state is distinct:** loading (with steps), answer, no results (with the date range), clarify, refused (write or not available), error (with a retry button and technical details hidden), and a general "what can you do?" card.
- Dark mode, a mobile layout, and a schema browser in plain Vietnamese.

## How AI tools were used

- **Claude Code (Claude Opus)** did most of the work:
  - Planning from the brief and my research notes (`docs/RESEARCH.md`, `docs/PLAN.md`).
  - The whole backend, prompt and eval set.
  - Hand edits to the frontend, Docker, the tests, and the docs.
- **Lovable** generated the first version of the UI from a prompt Claude wrote (`docs/lovable_prompt.md`).
- **Every prompt is logged** in [`AI_USAGE_LOG.md`](AI_USAGE_LOG.md): what was asked, what the AI did, what was actually checked, and what was fixed or rejected.

Main things I changed or rejected:
- **Rejected "Edit & run SQL"** from the plan: a shop owner can't use it. Replaced it with plain-language refine, Vietnamese reasoning steps, and ask-don't-guess.
- **Lovable's mock data** used invented columns, cities and products, and computed revenue without the paid-only rule. Rewritten to match the real schema.
- **Read-only:** testing showed a session can turn off the role's `default_transaction_read_only` with a single `SET`. Kept both the SELECT-only grants and the per-query read-only transaction, and added a test that proves it.
- **Multi-part questions** came back as one big CTE plus a meaningless chart. Asked for splitting; the AI built `kind: "split"`. **Rejected Kafka or a cache** for this: there's no stream, and the latency is the LLM, not the DB.
- **"Cuộc trò chuyện mới" did nothing visible,** and follow-ups lost context because only the SQL was sent back. Rebuilt it as real conversations, with result previews in the history.
- **A summary said "13 paid, 7 cancelled"** for 700 orders, because the LLM counted the 20 sample rows. Now stats are computed in code over all rows.
- **Charts labelled bars by category** instead of by name. Fixed the chart rules.
- **Q5 "from 2024":** the AI first wanted to read it as "in 2024" (empty result). I decided it means "2024 onwards".
- **The AI's own mistakes, caught while testing:**
  - A wrong eval expectation: all 20 products have sales, so "never sold" is correctly empty.
  - A few-shot example that had no effect, so it was removed.
  - Over-clarifying "list all orders".

## With more time

- A "Ý bạn là…?" chip for the other reading of ambiguous phrases (dates, "mua nhiều nhất" = money or quantity), detected in code rather than by the LLM.
- Saved, verified queries and 👍/👎 feedback, so good SQL can be reused as examples.
- Server-side pagination or export for results over 1,000 rows.
- Streaming progress, and an eval run in CI on every prompt change.
- Login and per-shop data, which a real deployment would need.
