# Ask the Database (take-home)

Build a **web app** that lets a shop owner ask questions about their data in plain language:
the user types a question → an LLM writes SQL → the app runs it on a PostgreSQL shop database
→ the page shows the answer.

Think of a real product that a non-technical shop owner would enjoy using, not a demo page.

## How we judge

> **Any model is fine. We do not judge the model.**
> We judge how you handle the task, and how you work with AI tools to get it done.

- A weaker model with a well-built app beats a strong model with a weak app.
- If the model writes wrong SQL, that is OK. We look at how your app handles it:
  does the user see the SQL and a clear message?
- We also judge the **user experience**: is the app clear, helpful, and pleasant to use?
- AI coding tools are welcome. Show us how you use them: what you ask,
  what you check, and what you fix or reject.

## Setup

You need: Docker, an LLM API, and your language ready with an LLM SDK and a PostgreSQL driver.

Start PostgreSQL in Docker and load `seed.sql` (schema + data). Run in this folder:

```bash
docker run -d --name shop-db -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop \
  postgres:16
docker exec -i shop-db psql -U postgres -d shop < seed.sql
docker exec shop-db psql -U postgres -d shop -c "SELECT COUNT(*) FROM orders;"   # → 700
```

Connection: `postgresql://postgres:postgres@localhost:5432/shop`

- Run the `seed.sql` line again any time to reset all data.
- Port `5432` busy? Use `-p 5433:5432` and port `5433` in the connection string.
- Stop and remove: `docker rm -f shop-db`

## You get

- `seed.sql`: 100 customers, 20 products, 700 orders from `2025-01-01` to `2026-10-12`.
- `schema.sql`: the schema with comments.

```sql
-- Revenue and spending count ONLY orders with status = 'paid'. Money is in VND.
customers(id, name, city, created_at DATE)
products(id, name, category, price_vnd)                          -- current list price
orders(id, customer_id, order_date DATE, status)                 -- 'paid' | 'pending' | 'cancelled'
order_items(id, order_id, product_id, quantity, unit_price_vnd)  -- price at time of order
```

## LLM

- Any LLM provider and model is fine: OpenAI, Gemini, Claude, a local model (e.g. Ollama), or other.
  A free tier or a local model is fine. (See "How we judge" above.)
- Read the API key, base URL, and model name from environment variables or a `.env` file.
  We will run your app with our own key.

## Rules

- Any language, any framework, any tools. AI coding tools are allowed.
  You must be able to explain every line (see the video below).
- It must be a web app, not a command-line app. Any frontend stack is fine.
- Do not change the data. Do not hand-write SQL for the test questions.

## Tasks (in order)

1. Question → SQL → run → the page shows the SQL and the result.
2. The app can never change or delete data.
3. The app never crashes. Every case shows the user a clear message on the page.
4. Build a real UI (see below).
5. *Bonus:* if the SQL fails, retry with the error.

## The UI

**Must have:**

- A clear way to ask a question, with a few example questions the user can click.
- The generated SQL, visible but not in the way.
- Results in a readable table: formatted numbers (e.g. `1,234,000 ₫`) and dates.
  Large results (hundreds of rows) must stay usable.
- A clear state for every case: loading, no results, error, refused, and
  "please clarify". The user should never wonder what happened.
- A history of the questions asked in this session.

**Then, your ideas.** This part is open. Some examples, not a checklist:

- A chart when the answer fits one (e.g. monthly revenue as a line chart)
- A short plain-language summary of the result
- Export to CSV, or copy the table
- Edit the SQL and run it again (still read-only)
- Follow-up questions in a chat style ("now only for 2026")
- A schema browser, dark mode, or a mobile layout

Pick what you think a shop owner needs most, or invent your own.
A few ideas done well beat many ideas done badly. Tell us why you chose them.

## Test questions

1. How many customers are there?
2. Top 3 customers by total spending
3. Customers who never placed an order
4. Monthly revenue in 2025
5. List all orders from 2024
6. Show employee salaries
7. Delete all cancelled orders
8. What is the best product?

Not every question has a normal answer. Decide what your app should do.
We will also try new questions that are not on this list.

## Submit

Email to **duong.nguyendai@seedcom.vn**:

1. **A screen recording** of the whole process, from opening this README to the finished app.
   - One continuous session: do not pause, cut, or edit the video. Do the test in one sitting.
   - End with a demo (about 5–10 minutes): run your app, try the 8 test questions, show your
     UI ideas, and briefly explain your main choices, especially for questions 5–8.
   - Talking while you work is welcome (English or Vietnamese), but not required.
   - Hide your API key on screen.
   - Upload to Google Drive, YouTube (unlisted), or Loom. The link must open without asking for access.
2. **A repo link (or zip)** with a short `README.md`:

- How to run it, including the environment variables we must set.
- Which LLM and model you used.
- How you used AI tools: which tools, what you asked them, and what you changed or
  rejected from their output. Chat logs are welcome but not required.
- What your app does for questions 5–8, and why.
- Which UI ideas you chose, and why.
- Anything you would do with more time.

Do not commit your API key.

Questions? Email **duong.nguyendai@seedcom.vn**.
