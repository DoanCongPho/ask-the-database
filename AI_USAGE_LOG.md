# AI Usage Log

How AI tools were used to build this project: what was asked, what was checked, and what was fixed or rejected.
This feeds the "How you used AI tools" section of the submission README.

Tool: Claude Code (model: Claude Opus 5.5).

---

## 1. Project setup: CLAUDE.md (2026-10-19)

**Asked:** `/init`: analyze the folder and write a `CLAUDE.md` for future AI sessions.

**AI did:** Read `README.md`, `schema.sql`, and the head/tail of `seed.sql`. Wrote `CLAUDE.md` with the DB setup commands, schema, business rules (paid-only revenue, `unit_price_vnd` vs `products.price_vnd`, VND formatting, data date range), hard requirements, and the intended edge case for each of test questions 5–8.

**Checked:**
- The folder has no app code yet, so no build/test commands were invented.
- No Cursor/Copilot/Codex/Gemini configs exist.
- `seed.sql` is generated ("Do not edit by hand"), so it was marked as do-not-edit.
- Not yet verified against a running DB: the date range (2025-01-01 → 2026-10-12) and the row counts were taken from the brief.

**Fixed / rejected:** None yet.

## 2. Start this log (2026-10-19)

**Asked:** "what you ask, what you check, and what you fix or reject. Keep track it when I prompt and coding for this project"

**AI did:** Created this file and added a rule to `CLAUDE.md` so every future session appends an entry after each prompt.

**Checked:** Nothing to verify yet.

**Fixed / rejected:** None.

## 3. Lovable UI prompt + project plan (2026-10-19)

**Asked:** "From a README.md, first you need to create for me a prompt for the UI so I can use other AI platform to build UI for that (lovable..). Second you need to propose plan for doing this project"

**AI did:** Asked two stack questions. User chose Python FastAPI backend and an OpenAI-compatible LLM client (base URL/key/model from env). Wrote a full project plan and a Lovable prompt (`docs/lovable_prompt.md`) that includes a fixed API contract (`/api/ask`, `/api/run-sql`, `/api/schema`, `/api/health`, statuses ok/empty/clarify/refused/error) and a mock mode, so the UI can be built before the backend exists.

**Checked:** The prompt covers every "Must have" UI item in the brief (example questions, SQL visible but collapsed, formatted money/dates, large results, all five states, session history). Told the user to check that Lovable's output uses `VITE_API_URL` and doesn't pull in Supabase (its default).

**Fixed / rejected:** User rejected approving the full plan at once: "Do the first lovable prompt and we will discuss the core approach later." Backend/core approach is deferred for discussion; only the Lovable prompt was delivered.

## 4. Save the Lovable prompt to a file (2026-10-19)

**Asked:** "Where is a docs?"

**AI did:** The prompt had only been shown in chat, because plan mode blocked writing files. Saved it to `docs/lovable_prompt.md`, taking the same text as the chat version.

**Checked:** The file content matches the prompt shown in chat.

**Fixed / rejected:** The AI had said it would save the file "once out of plan mode" but didn't do it until the user asked.

## 5. Finding and viewing the plan (2026-10-19)

**Asked:** "How can I see the previous plan?" then "Does claude provide instruction for display them?"

**AI did:** Pointed to the plan file in `~/.claude/plans/`. Looked up the official Claude Code docs (permission-modes page): `Ctrl+G` opens a plan in your editor only while it is waiting for approval; plans are saved to `~/.claude/plans/` or to a `plansDirectory` setting.

**Checked:** Read the docs page itself instead of answering from memory.

**Fixed / rejected:** None.

## 6. Copy the plan into docs (2026-10-19)

**Asked:** "copy the plan into docs"

**AI did:** Copied the plan to `docs/PLAN.md` and added a "draft" note at the top, because the core approach hasn't been agreed yet.

**Checked:** The file exists and its content matches the original plan file.

**Fixed / rejected:** Entry 5 was logged late. The AI skipped logging after those two prompts and only caught up here.

## 7. Few-shot examples vs. RAG (2026-10-19)

**Asked:** Should we build a RAG system that pulls similar queries to help the LLM write more accurate SQL? The user's own view: the schema is simple enough that RAG isn't needed.

**AI did:** Agreed: no RAG. The full schema plus about 6 static few-shot examples fit in one prompt, and RAG would add infrastructure, latency and failure points with no accuracy gain. Defined the few-shot set as patterns (paid-revenue join, `date_trunc` series, CTE aggregation, refuse-write, not-available, clarify), each kept clearly different from the 8 test questions. Recorded the decision in `docs/PLAN.md`.

**Checked:** Compared the planned examples against the test question list so none is a near-copy. Example SQL is not yet run against the DB; that happens before it goes into the prompt.

**Fixed / rejected:** The user rejected RAG as over-engineering for a 4-table schema, and the AI agreed. RAG over a store of verified past queries is kept as future work.

## 8. UX changes for a non-technical owner (2026-10-20)

**Asked:** Remove "Edit & run SQL", since shop owners don't know SQL. Let them adjust answers in plain language instead. Show the AI's reasoning steps in Vietnamese behind a button. For ambiguous questions (e.g. "thống kê các sản phẩm được yêu thích nhất"), prefer asking a clarifying question over guessing and logging the steps.

**AI did:** Updated the plan (in `~/.claude/plans/`): removed `/api/run-sql`; added a plain-language "Điều chỉnh câu trả lời" refine box sent as a follow-up; added a `steps: string[]` field shown under "Xem cách tôi tìm câu trả lời"; adopted a clarify-first policy, keeping defaults only for a missing time range or top-N. Asked about UI language; the user chose a fully Vietnamese UI.

**Checked:** Not yet applied to `docs/lovable_prompt.md` or `docs/PLAN.md`.

**Fixed / rejected:** User rejected the "Edit & run SQL" idea (too technical for the target user) and the "state a default interpretation" approach for ambiguous questions, in favor of asking. Also: during plan mode the AI edited `docs/PLAN.md` and `AI_USAGE_LOG.md` (entry 7), which plan mode doesn't allow; it disclosed this to the user.

## 9. Research on similar apps (2026-10-20)

**Asked:** Quick research on apps that answer data questions from prompts: list the problems they report and the ideas they use.

**AI did:** Six web searches covering Snowflake Cortex Analyst, Databricks Genie, ThoughtSpot Sage, Julius AI, Vanna, Wren AI, the AmbiSQL paper and surveys. Wrote `docs/RESEARCH.md` with 9 problems and 11 ideas, each marked Adopt / Later / Skip for our app.

**Checked:** Facts come from search result summaries, not full reads of every page. Several sources are vendor or review sites, and the file says so. The Vanna "archived" claim and the ZenML accuracy numbers were not independently verified.

**Fixed / rejected:** Marked as Skip: confidence meter (LLM self-confidence is unreliable) and DB views (they change the database). Verified-query store and thumbs up/down are Later.

## 8. UX direction change + plan revised from research (2026-10-20)

**Asked:** (1) Drop "Edit & run SQL": a shop owner doesn't know SQL. Let them refine an answer in plain language instead. (2) Show the AI's reasoning steps in Vietnamese behind a button. (3) For ambiguous questions, ask a follow-up instead of guessing. (4) Revise the plan based on `docs/RESEARCH.md` (the user's own research on Snowflake Cortex, Databricks Genie, ThoughtSpot, Julius, AmbiSQL), then review and edit the Lovable-generated frontend.

**AI did:** Asked what language the UI should use. The user chose Vietnamese everywhere. Rewrote the plan in two parts.
- Part A, frontend edits: remove SQL editing, add a plain-language "Điều chỉnh câu trả lời" box, add a "Xem cách tôi tìm câu trả lời" steps panel, translate the UI to Vietnamese, rewrite the mock data.
- Part B, backend: classify the question first, clarify before guessing, add a business glossary, write the eval set before building, retry with transparency.

Each change is tied to a research item (P1/P2/I1–I9).

**Checked:** Read the whole Lovable frontend. Found that the mock data doesn't match the real schema: columns `order_id`, `full_name` and `total_vnd` don't exist, it uses cities that aren't in the data (Hải Phòng, Huế) and clothing products, and its revenue ignores the paid-only rule. The real backend wouldn't produce any of this, so the mocks are being rewritten. Also confirmed the frontend is TanStack Start (SSR), not plain Vite, and that `node_modules` isn't installed yet.

**Fixed / rejected:**
- The user rejected the AI's "Edit & run SQL" idea, which came from the brief's list of examples, as too technical for the target user.
- The user rejected "pick a default and state the interpretation" for ambiguous questions in favor of asking first.
- The AI's earlier Lovable prompt specified English UI copy. It was replaced by Vietnamese.

## 9. Frontend edits, Part A (2026-10-20)

**Asked:** Carry out Part A of the approved plan: edit the Lovable frontend.

**AI did:**
- Removed "Edit & run SQL", `runSql` and `/api/run-sql`.
- Added a plain-language "Điều chỉnh câu trả lời" box on each answer. It sends a follow-up with *that card's* context.
- Added `steps` to the contract, plus a `ReasoningSteps` panel ("Xem cách tôi tìm câu trả lời").
- Retries are now shown visibly on the answer, not hidden inside the SQL panel (research P7).
- Translated the whole UI to Vietnamese and changed date formats to `dd/MM/yyyy` and `Tháng M/yyyy`.
- Rewrote the mocks to use the real schema, real customer and product names, and the paid-only rule.
- Added `.env.example`, ignored `.env`, and ran Prettier over the edited folders.
- Updated `CLAUDE.md` with the frontend commands and the UX decisions.

**Checked:**
- `tsc` passes. `vitest` passes 6/6, including new date tests. `eslint` has 0 errors; there are 7 warnings in Lovable's `ui/` files.
- The dev server renders the page server-side with `lang="vi"` and the Vietnamese title, greeting and chips.
- A script called `mockAsk` on the 8 test questions plus extras: Q5 gives empty, Q6 refused/not_available, Q7 refused/write_operation, Q8 and "sản phẩm được yêu thích nhất" give clarify, and the clarify option "Theo doanh thu" gives ok.
- **Not checked:** clicking through the UI in a browser, because the Chrome extension wasn't connected. The user still needs to check visually: the steps toggle, the refine box, mobile width, and dark mode.

**Fixed / rejected (AI's own findings in Lovable output):**
- The mock data used columns that don't exist (`order_id`, `full_name`, `total_vnd`), invented cities, and revenue without the paid filter. It was rewritten.
- `parseDate` would read `"2025-10-01T00:00:00"` (what `date_trunc` returns) in local time and could show the wrong month in UTC+7. Fixed by parsing only the date part. The backend will also cast to `::date`.
- Lovable's code didn't pass its own Prettier lint (230 errors). Fixed by reformatting.

## 10. Backend, Part B (2026-10-20)

**Asked:** "start part B backend"

**AI did:**
- Started Postgres on port 5433, because 5432 was taken by another project's container, which was left alone. Loaded `seed.sql`.
- Added `db/readonly_role.sql`, a SELECT-only `shop_reader` role.
- Built the FastAPI backend: `config`, `safety` (sqlglot validator), `db` (read-only transaction, timeout, row cap), `llm` (OpenAI-compatible JSON client with Vietnamese error messages), `prompt` (schema, glossary, 6 pattern examples, clarify-first rules), `formatting` (column types, labels, chart choice), `pipeline` (classify, validate, run, retry up to 2 times with the DB error, summarize), and `main` (endpoints; every error comes back as JSON).
- Added 50 pytest tests and an eval script with 21 questions: the 8 from the brief plus 13 of our own.

**Checked:**
- Verified the data against the brief: 100 customers, 20 products and 700 orders; orders from 2025-01-01 to 2026-10-12; customers signed up 2024–2025. 6 customers have never ordered, and 566 order items were sold at a price different from the list price. The prompt states these facts.
- 50/50 tests pass. They run against the real DB and fake the LLM.
- Tried to write through the `shop_reader` role directly in psql: DELETE, UPDATE and CREATE were all refused, and the order count is still 700.
- Every few-shot SQL example runs and returns the columns it declares (research P5).
- Called the API over HTTP: health, ask with a missing key gives a clear message, and CORS allows the frontend origin.
- Stopped the DB: the app answers with a clear message in about 2 s.
- **Not checked:** any real LLM output. No API key is set, and the local Ollama is misconfigured (its models folder points to an unmounted USB drive, `/Volumes/KINGSTON`). The eval script hasn't been run with a model yet, and the frontend is still in mock mode.

**Fixed / rejected (AI's own findings):**
- The plan relied on the role's `default_transaction_read_only`. Testing showed a session can turn it off with a single `SET`. Writes were still blocked only because of the SELECT-only grants. Kept both layers and documented why.
- With the DB down, the first version waited about 10 s (two pool timeouts) and would have called the LLM for nothing. It now pings the DB first, so the answer comes back in about 2 s.
- A write that gets past the validator and is then blocked by the DB (`ReadOnlySqlTransaction`/`InsufficientPrivilege`) was being treated as a retryable SQL error. It is now reported as `refused/write_operation`.

## 11. Switch the LLM to OpenAI

**Asked:** "I have the openai api key so change it to openai model"

**AI did:**
- The client already talks to OpenAI when `LLM_BASE_URL` is empty. Changed the default model from `gpt-4o-mini` to `gpt-4.1-mini` (better at following instructions and writing SQL, still cheap) in `app/config.py`, `backend/.env` and `.env.example`.
- `llm.chat_json` now drops an option the model rejects and tries again. Reasoning models (gpt-5, o-series) reject `temperature=0`, and some providers reject JSON mode, so switching to one of those models by changing `LLM_MODEL` doesn't break the app.
- Asked the user to put the key in `backend/.env` themselves, so it never appears in the chat or the log.

**Checked:**
- Added `tests/test_llm.py`, which uses a fake client to check the retry with each unsupported-option combination. 54/54 tests pass.
- Restarted uvicorn with `--reload`; `/api/health` reports `llm_model: gpt-4.1-mini` and the DB as up.
- **Not checked:** a real OpenAI call. The key isn't set yet.

**Fixed / rejected:**
- The earlier fallback dropped only JSON mode, so a gpt-5 model would have failed on `temperature`. Fixed above.

## 12. Docker and docker compose for the whole app

**Asked:** "Write docker and docker compose for running all of time" (run the whole stack).

**AI did:**
- `docker-compose.yml` with 3 services:
  - `db`: postgres:16. It seeds from `seed.sql` and then `db/readonly_role.sql` on first start. It has no host port, so it doesn't clash with `mrson_rag_db` on 5432 or the dev `shop-db` on 5433. Its healthcheck connects as `shop_reader` over TCP, so it only passes once the init scripts are done.
  - `backend`: FastAPI. It reads `backend/.env` for the LLM settings; compose overrides `DATABASE_URL` and `CORS_ORIGINS`.
  - `frontend`: a Node server.
- Host ports can be changed with `FRONTEND_PORT` and `BACKEND_PORT`.
- `backend/Dockerfile` (python:3.12-slim, non-root, healthcheck). `SCHEMA_PATH` was made an env var so `schema.sql` can live inside the image.
- `frontend/Dockerfile`: builds with bun, runs on node:22. `VITE_API_URL`/`VITE_USE_MOCK` are build args, because Vite bakes them into the bundle.
- `.dockerignore` files keep `.env`, `.venv` and `node_modules` out of the images.

**Checked:**
- `docker compose up --build`: all 3 services healthy.
- `/api/health` returns ok. A real `POST /api/ask` ("Có bao nhiêu khách hàng?") answered 100 with gpt-4.1-mini, so the user's key in `backend/.env` reached the container.
- CORS allows the frontend origin. The page serves `lang="vi"`. The built bundle has the right API URL and mock mode off.
- A DELETE as `shop_reader` in the container's DB was refused; there are still 700 orders. 54/54 tests pass inside the backend container.
- **Not checked:** clicking through the UI in a browser, because the Chrome extension isn't connected.

**Fixed / rejected (AI's own findings):**
- Lovable's build config targets Cloudflare Workers by default, so a plain `vite build` output can't run under Node. Fixed by building with `NITRO_PRESET=node-server` (found in the Lovable config source).
- Stopped the local dev uvicorn that was holding port 8000, so the compose stack could use the default ports.

## 13. Pipeline diagram

**Asked:** "Explain the pipeline when the question come from the backend, can you write the sequence diagram or any kind of diagram that is good for visualizing."

**AI did:** `docs/PIPELINE.md` with Mermaid diagrams, written from the actual code in `pipeline.py`, `safety.py` and `db.py`:
1. A sequence diagram from browser to API to pipeline to DB and LLM, including the retry loop and every exit.
2. A flowchart showing which status the user sees, with test questions 5–8 placed on it.
3. The 4 read-only layers.
4. A note on how history and refine work.

**Checked:** each branch against the code: the order of the exceptions in `_ask`, the retry count, the 2 s ping, `fetchmany(1001)`, and that the summary call is skipped on failure. Removed semicolons from one sequence message, because Mermaid treats `;` as a line break. **Not checked:** rendering the diagrams in a Mermaid viewer.

## 14. Let the user type a custom answer to a clarify question

**Asked:** (Vietnamese, with a screenshot of the clarify card for "Sản phẩm nào tốt nhất") Let the user type their own answer on the clarify card instead of only picking an option.

**AI did:**
- Took the text box out of `RefineBox` into a shared `TextReply` in `AnswerCard.tsx`.
- The clarify card now shows that box under the option chips, with the placeholder "Hoặc tự ghi ý bạn, ví dụ: theo số lượng bán năm 2025".
- It sends through the same `onRefine` path as the chips. The history includes the clarify turn, so the backend sees the original question.
- Rebuilt the Docker frontend.

**Checked:**
- Typecheck passes; lint has 0 errors (7 warnings that were already there, none in this file); 6/6 vitest tests pass.
- Sent the API what the new box produces: "theo số lượng bán năm 2025" with history ["Sản phẩm nào tốt nhất", no SQL]. gpt-4.1-mini returned `ok` with SQL that sums quantity, filters paid orders in 2025, and returns the top 5 (Dish soap 750ml 139, …).
- The rebuilt bundle contains the new text.
- **Not checked:** clicking it in a browser (the Chrome extension isn't connected).

## 15. Split multi-part questions into separate queries

**Asked:** (Vietnamese, with a screenshot of "khách hàng mua nhiều nhất và sản phẩm được mua nhiều nhất trong năm 2026" answered with one big CTE that needed a retry, plus a bar chart comparing a customer's quantity to a product's quantity) Questions with several parts should be split into several queries instead of one combined query, which is error-prone. Maybe use Kafka or a cache to store consecutive queries.

**AI did:**
- New LLM `kind: "split"` with `parts` (2–3 self-contained sub-questions). Added a prompt rule, including when *not* to split ("doanh thu và số đơn theo tháng" is one table), and a non-test few-shot example.
- `pipeline._split` runs each part through the full pipeline in parallel threads, with `allow_split=False` so parts can't split again. It returns `status: "multi"` with `parts[]`. A part that crashes becomes an error part, not a failed answer.
- Frontend: extracted `ResponseBody` from `AnswerCard`. `MultiBody` shows "Phần 1: …", "Phần 2: …", each with the usual card. Refining a part sends only that part as context. Also added a sidebar icon, a mock and types.
- **Rejected Kafka and a result cache** and told the user why: Kafka is a message broker for streams between services, and nothing here is a stream. Parts run in parallel within one request, and earlier queries are already kept as conversation history. A result cache wouldn't help much: the data is small and static, a query takes milliseconds, and the latency is the LLM. Logged as future work if latency matters.

**Checked:**
- Backend tests for split, a refused part, and a part trying to split again (56/56 at that point). Frontend mock test.
- Live: the user's exact question now gives `multi`, with two queries each correct on the first try (Dang Phuc 9,050,000 ₫; Laundry powder 3kg 115).
- "Doanh thu và số đơn đã thanh toán theo tháng năm 2026" stays a single `ok` query, and Q8 still gives `clarify`.
- **Noticed:** the first part read "mua nhiều nhất" for customers as spending (the old combined query used quantity). It is stated in the part's question text, so the owner can see it and refine.

## 16. "Cuộc trò chuyện mới" does nothing; follow-ups lose context

**Asked:** (Vietnamese, with a screenshot of the sidebar) The "new conversation" button doesn't activate, and the chat context doesn't seem to feed in earlier turns, so follow-ups don't work.

**AI did:**
- **Root cause 1:** the button only moved an invisible `ctxStart` index. The screen didn't change, and the old answers stayed visible. Replaced it with real conversations:
  - Each turn has a `convId`.
  - The button opens an empty conversation with the example questions.
  - The sidebar lists conversations (title = first question), and the open one expands to its questions. Older conversations can be reopened, with their context.
  - "Xóa lịch sử" became "Xóa tất cả".
- **Root cause 2:** `history` only sent `{question, sql}`, so the model never saw the results, nor what a clarify card had asked. Now each turn also sends `status`, `answer` (summary or message), `options`, column names and the first 5 rows. `prompt._prior_answer` replays these, clipped in size.
- New prompt rule 0: resolve a follow-up ("người đứng đầu", "khách đó") against the previous result *before* considering `clarify`. Without it, the live eval showed "người đứng đầu ở thành phố nào?" getting `clarify`.
- `scripts/eval.py` follow-ups now send the same history shape the frontend does. Added 3 eval items: a follow-up that refers to a result, a typed clarify answer, and a split question.

**Checked:**
- Backend: a test that history includes the clarify options and the 5-row preview. 57/57 pass.
- Frontend: new `src/test/conversation.test.tsx` renders the real page with a stubbed API. It checks that:
  - a follow-up sends the previous turn, including rows and summary
  - "Cuộc trò chuyện mới" clears the view and sends empty history
  - reopening the old conversation restores its context
- 9/9 vitest pass, typecheck passes, lint has 0 errors.
- Live eval: **24/24**. 700 orders unchanged.
- **Not checked:** clicking it in a real browser (the extension isn't connected). The jsdom test is the substitute.

**Fixed / rejected (AI's own findings during this work):**
- **Q5 "List all orders from 2024" regressed**:
  - First it gave `clarify` ("which status?"). Fixed with a rule: when the scope is clear, don't clarify, and still write SQL for dates outside the data.
  - Then it sometimes gave 700 rows, reading "from 2024" as ">= 2024". Fixed with a glossary rule: a named year means only that year. Q5 was then `empty` 3 out of 3 times.
- Tried a few-shot example ("Paid orders from 2025 by city") to fix "Orders from 2025", which still reads as "since 2025". It had no effect, so I removed it rather than keep prompt weight with no proven benefit. This remains a known ambiguity in English. The `interpretation` line shows how it was read.
- "Sản phẩm nào chưa từng được bán?" was expected `ok`, but all 20 products have sales (checked in psql), so `empty` is the correct answer. Fixed the eval expectation, not the app.

## 17. Should unclear questions get a confirmation? What does the brief say about big lists?

**Asked:** (Vietnamese) For phrasing like "from 2024", should the app confirm ("ý bạn là trong năm 2024?"), and generally ask back when there isn't enough context? Does the brief define how many rows is "too many"? In practice you can't list every product if there are many, but a specific list is fine. The user can ask their mentor, so check the brief.

**AI did:**
- **Read the brief.** It doesn't define a row limit or a threshold for "too many".
  - It says: "Results in a readable table … Large results (hundreds of rows) must stay usable."
  - It lists "please clarify" as a required state, but doesn't say which questions need it.
  - For the test questions it says: "Not every question has a normal answer. Decide what your app should do."
  - So "Q5 must be empty" is our own reading of the edge case, not stated in the brief.
- **Probed with the live model and found 2 bugs:**
  - "List all orders" gave `clarify` (asking for status or time), even though the user said "all".
  - "Liệt kê tất cả chi tiết đơn hàng" gave `refused` ("no such table"), even though it is `order_items`.
- **Fixed both in the prompt:**
  - A list of Vietnamese names for each table.
  - Only clarify an unclear metric, never a filter the user didn't mention. "List all X" is clear.
- After the fix, "List all orders" gives `ok` with 700 rows, 2 out of 2 times. Q8 and "khách hàng tốt nhất" still give `clarify`.
- **Laid out options for the user to decide, instead of picking one.** Recommendation:
  - Answer with the most likely reading, and add a one-click chip for the other reading ("Ý bạn là từ 2024 trở đi?").
  - For a big result, show it paginated with "Hiển thị 1,000 dòng đầu tiên" plus narrowing chips, rather than blocking with a question.
  - The reason: this keeps "please clarify" for real ambiguity (Q8), and the brief explicitly wants hundreds of rows to stay usable.

**Checked:**
- 57/57 tests pass.
- Live eval: 23/24. **Q5 "List all orders from 2024" flipped back to 700 rows** in this run, so the model's reading of "from <year>" is unstable even at temperature 0. The prompt rule alone isn't reliable, which supports handling this ambiguity explicitly.
- "Liệt kê tất cả chi tiết đơn hàng" now gives `clarify` (narrow by year, status or customer) instead of `refused`. That's better, but it's the size-based clarify the user is asking about, so it's left until they decide.

**Fixed / rejected:** nothing rejected yet. The confirmation design is waiting on the user (and possibly their mentor).

## 18. Chart hides the names the owner asked for

**Asked:** (Vietnamese, with a screenshot) A bar chart for "khách hàng mua nhiều nhất và sản phẩm được mua nhiều nhất" showed bars labelled "Khách hàng" / "Sản phẩm" with quantities. The names (Dang Phuc, Laundry powder 3kg) were only visible after switching to the table.

**AI did:** Rewrote `formatting.pick_chart`:
- Bars are labelled by the row's name column (`name`, `*_name`, `ten`, or a label starting with "Tên") when one exists. This applies even when the LLM's chart hint points at a category column.
- Id columns are never used as labels.
- With fewer than 3 rows there is no chart, so the table, which shows the names, is the default.
- A `line` hint is only accepted on a date or month axis.

**Checked:**
- New `tests/test_formatting.py` (5 cases, including the screenshot's 2-row case). 62/62 tests pass.
- Live:
  - top 5 products with category → bars labelled by product name
  - top 3 customers → bars by name, not id
  - revenue by category → bars by category
  - a single top customer → no chart (table)
- **Note:** the screenshot was an older answer kept in session history, from before the split change. Stored answers keep their old chart; new answers use the new rule.

## 19. "From 2024" means 2024 onwards; the summary miscounted orders

**Asked:** (Vietnamese, with 2 screenshots)
- The user thinks "from 2024" should mean 2024 onwards, so all of 2025 and 2026. This answers the open question from entry 17.
- In the "từ 2025" answer, the summary said "13 đơn đã thanh toán và 7 đơn bị hủy", but the table had 14 pages.

**AI did:**
- **Date rule, per the user's decision:**
  - "từ / from / since <year>" = from that year to the end of the data.
  - "năm / trong năm / in <year>" = only that year.
  - Q5 now returns all 700 orders. The summary says "Không có đơn hàng nào từ năm 2024, tất cả 700 đơn đều từ năm 2025 trở đi".
  - The empty-result demo moved to "Đơn hàng trong năm 2024".
  - Updated CLAUDE.md and the eval set.
- **Summary bug:** the root cause is that the summary call only saw the first 20 rows and counted them as if they were everything.
  - `_stats` now computes facts over all rows: counts per category value, min/max, and sums (but not for prices or averages).
  - The payload sends `row_count_exact` or `row_count_at_least` and calls the rows `sample_rows`. The prompt forbids counting or summing the sample.
  - For a truncated result, no stats are sent and the summary says "ít nhất N" and suggests narrowing. Before this, it reported sums over the first 1,000 rows as totals, including a "total" of unit prices.

**Checked:**
- 64/64 tests pass (new: stats over 700 rows, no sum of unit prices).
- Live, compared with psql:
  - "Đơn hàng từ 2025": 700 orders, 524 paid / 100 cancelled / 76 pending, which matches the DB.
  - "Đơn hàng năm 2026": 300 orders (DB: 300). The first try said "ít nhất 300" though not truncated; fixed with the exact/at-least field.
  - Truncated order items: "ít nhất 1000", no fake totals.
- Eval 25/25 (before the summary-only tweaks).
- **Seen but not fixed:** "Đơn hàng từ 2025" asked as a fresh question once gave `clarify` ("thông tin gì?"). The model is still inconsistent on bare noun phrases.

## 20. General questions: "what can you do?", "which tables are there?"

**Asked:** (Vietnamese) Add one more type: general questions like "bạn làm được gì cho tôi?" or "trong database này tôi biết được thông tin gì, có những bảng nào?"

**AI did:**
- New LLM `kind: "info"` with a prompt rule (rule 0b): general questions, how to use the app, greetings and thanks. The message is 2–4 plain sentences without English table names or SQL terms, followed by 3–4 example questions. Added a non-test few-shot example ("Bạn giúp được gì cho tôi?").
- `status: "info"` responses carry `tables` from a new `app/schema_info.py`. This is the same Vietnamese description `/api/schema` serves, moved out of `main.py`. The table list therefore comes from code and the model can't invent tables.
- Frontend `InfoBody`: a "Tôi có thể giúp bạn" card with the message, a grid of tables (Vietnamese name plus plain column descriptions, ids hidden), and clickable example questions. Also added a sidebar icon, a mock and types. `info` turns replay in history as `{"kind": "info", "message": ...}`.

**Checked:**
- Backend test: an info answer has the 4 real tables, no SQL, and the suggestions. 65/65 pass.
- Frontend mock test. 10/10 vitest pass; typecheck passes; lint has 0 errors.
- Live: "Bạn có thể làm gì cho tôi?", "Trong dữ liệu có những bảng nào…" and "Xin chào" all give `info`, with an accurate description (4 tables and their fields, read-only, data from 2025).
- Eval with 3 new info questions (Vietnamese and English): **28/28**.
- **Not checked:** how the card looks in a browser (the extension isn't connected).
- **Noticed:** one suggested question ("Khách hàng mua nhiều nhất") is itself ambiguous and will get a clarify card when clicked. Left as is.

## 21. Public repo, feature PRs, gitignore, new README

**Asked:** Create a public repo with PRs split by feature. Update `.gitignore`, move the original README to `docs/`, and write a new README that covers the brief's submission list (how to run and env vars, LLM/model, AI tool usage, Q5–8, UI ideas, future work).

**AI did:**
- Asked 2 questions first. Merge the PRs or leave them open? → merge one by one, so `main` runs. Repo name? → `ask-the-database`.
- Root `.gitignore` covers `.env` and `.env.*` (keeping `.env.example`), Python and Node build output, `.DS_Store`, and the empty `docs/ideas.md`.
- Moved the brief to `docs/BRIEF.md` and updated the references in `CLAUDE.md`, `docs/PLAN.md` and `safety.py`. Replaced Lovable's default `frontend/README.md`, which linked to the Lovable project.
- New `README.md`. Its "How AI tools were used" section summarises this log.
- Created `DoanCongPho/ask-the-database` (public). Initial commit: brief, schema, seed. Then 6 PRs, each created from `main` and merged before the next:
  1. Research, plan and `CLAUDE.md`.
  2. Read-only query layer.
  3. Text-to-SQL pipeline and API.
  4. Frontend.
  5. Docker.
  6. README, this log and `docs/PIPELINE.md`.

**Checked:**
- `git add --dry-run` before the first commit: only `.env.example` files, no `.env`, `node_modules`, `.venv` or build output. The PR script refuses to commit if a `.env` is staged.
- Grepped the code and docs for keys and personal paths: none.
- PR 2's files only import each other, so its tests run on their own.

**Fixed / rejected / limits:**
- The PRs are grouped by component and feature from the *final* code. They are not the true chronological history, because the project wasn't in git while it was built. Features that touch the same file (for example clarify, split and info in `AnswerCard.tsx`) are in one PR.
- **Note for the user:** `docs/BRIEF.md` is now public. It includes the reviewer's submission email address.

## 22. Language switch, and English answers to English questions

**Asked:** (Vietnamese, with a screenshot: "What is the best product?" got a Vietnamese clarify card) Add a language picker like the light/dark switch. Answers and suggestions should be in English when the question is in English. This **replaces the earlier decision** (entry 8 / CLAUDE.md) that all UI and AI text is Vietnamese.

**AI did:**
- **Frontend:**
  - `src/lib/i18n.tsx` holds the vi/en dictionary (about 70 strings, plus example questions per language) and an `I18nProvider` with a `useI18n()` hook.
  - A VI/EN button in the header next to dark mode. The choice is stored in localStorage, sets `<html lang>`, and is sent as `lang` with each question.
  - All shop components were translated.
  - `formatCell` and `compactMoney` take the language (months `Oct 2025`, axis `1.2M`).
  - The schema sheet fetches `/api/schema?lang=`.
- **Backend:**
  - New `app/i18n.py` holds every fixed message the app writes itself (DB down, empty question, too long, blocked write, timeout, gave up, empty result plus date range, split, LLM errors). `LLMError` now carries a message key.
  - New English `SCHEMA_INFO_EN`, used by `info` answers and `/api/schema?lang=en`.
- **Prompt:**
  - A language rule: write all text in the question's language, and fall back to the UI language when the question's language is unclear. The model reports the language it used in a new `lang` field, and the pipeline uses it for fixed messages and the summary (`answer_language`).
  - The English few-shot example ("How many paid orders per week in 2026?") was answered in Vietnamese and is now answered in English. All examples carry `lang`.

**Checked:**
- Backend tests for message language (the UI language before the model runs, then the question's language) and for the fallback named in the prompt. 67/67 pass.
- Frontend UI test: the button switches to English (heading, example questions, `<html lang>`), sends `lang: "en"`, and switches back. 11/11 vitest pass; typecheck passes; lint has 0 errors (the 4 new warnings are the same fast-refresh kind as the existing ones).
- Live (gpt-4.1-mini):
  - "What is the best product?" with the UI in Vietnamese → English clarify and options.
  - "Sản phẩm nào tốt nhất?" with the UI in English → Vietnamese.
  - "Top 3 customers…" → English summary, steps and labels.
  - "What can you do?" → English message and English table names.
  - The follow-up "2026" with the UI in English → English.
- Eval **28/28**, 700 orders unchanged.
- **Not translated:** the 404 and error pages in `__root.tsx`/`error-page.ts` (outside the app's language state), network error details from `api.ts`, and the sample answers in mock mode.
- **Not checked:** clicking it in a real browser.
