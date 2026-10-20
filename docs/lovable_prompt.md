# Lovable UI prompt

> **Superseded.** This is the original prompt used to generate `frontend/`. The output was then edited by hand: Vietnamese UI, "Edit & run SQL" removed, plain-language refine and reasoning steps added, mocks matched to the real schema. See `AI_USAGE_LOG.md` entries 8–9 and `docs/PLAN.md` Part A.

Paste the block below into Lovable (lovable.dev) to generate the frontend.
The API contract at the end must match the backend; update both together if it changes.

````text
Build a single-page web app called "Ask Your Shop": a friendly analytics assistant for a
non-technical owner of a small Vietnamese online shop. The owner types a question in plain
language (English or Vietnamese), a backend turns it into SQL, runs it, and returns the result.
It should feel like a polished real product, not a demo.

TECH: React + TypeScript + Vite + Tailwind + shadcn/ui, Recharts for charts, TanStack Table
(+ virtualization) for tables, lucide-react icons. NO Supabase, NO auth, NO database in the
frontend. All data comes from my own REST backend at `import.meta.env.VITE_API_URL`
(default http://localhost:8000). Put every API call in one file `src/lib/api.ts`, with types in
`src/lib/types.ts`. Add a mock mode (`VITE_USE_MOCK=true`) returning realistic sample responses
for EVERY status below, so the UI works without the backend.

LAYOUT (desktop): left sidebar = session history; main area = conversation-style feed of
answer cards with the question box pinned at the bottom (like a chat app). Mobile: sidebar
becomes a drawer, everything single-column, no horizontal page scroll (tables scroll inside
their card). Light + dark mode toggle.

EMPTY START SCREEN: short greeting ("Ask anything about your customers, products, orders
and revenue"), a small "What's in your data" line (100 customers, 20 products, 700 orders,
Jan 2025 – Oct 2026), and clickable example-question chips. Clicking a chip asks it
immediately. Chips:
- How many customers are there?
- Top 3 customers by total spending
- Customers who never placed an order
- Monthly revenue in 2025
- What is the best product?
- Revenue by city this year

QUESTION BOX: multiline textarea, Enter to send, Shift+Enter for newline, send button,
disabled while loading. A "New conversation" button clears follow-up context.
Follow-ups ("now only for 2026") are supported: send the previous turns as `history`.

ANSWER CARD (one per question), top to bottom:
1. The question (as a user bubble).
2. A one-line plain-language `summary` in large readable text (e.g. "You have 100 customers.").
   If `interpretation` is present show it as a subtle note: "I understood this as: …".
3. A chart when `chart` is not null (line for time series, bar for categories), with a
   Chart / Table toggle.
4. Results table (see TABLE).
5. A collapsed "Show SQL" section: syntax-highlighted SQL, Copy button, and "Edit & run"
   which turns it into an editable textarea and calls POST /api/run-sql. If `attempts` has
   more than one entry, show "Fixed automatically after N tries" with the earlier failed SQL
   and error text expandable.
6. Footer actions: Copy table, Download CSV, row count ("Showing 1,000 of 1,000+ rows" if
   `truncated`), execution time.

TABLE: sticky header, click column header to sort client-side, zebra rows, virtualized or
paginated (50 rows/page) so 1,000 rows stay smooth. Format by column `type`:
- "money": `1,234,000 ₫` (en-US grouping, ₫ suffix), right-aligned
- "number": `1,234` (decimals max 2), right-aligned
- "date": `12 Oct 2026`; "month": `Oct 2025`
- "text": as-is; null → muted "—"
Human-friendly headers: `total_spending_vnd` → "Total Spending".

STATES: every one must be visually distinct, with an icon, title, and helpful text:
- loading: skeleton card + rotating step text ("Understanding your question…",
  "Writing SQL…", "Running query…"). Never a blank screen.
- ok: as above.
- empty: SQL ran but returned 0 rows. Friendly illustration, the backend `message`
  (e.g. "No orders in 2024. Your data starts on 1 Jan 2025"), SQL still visible, and
  `suggestions` as clickable chips.
- clarify: amber card "I need a bit more detail", the `message`, and `options` as clickable
  chips; clicking one sends it as a follow-up question.
- refused: neutral/red-ish card with a shield icon. `reason: "write_operation"` → "I can only
  read your data. I can't change or delete anything." `reason: "not_available"` → "Your
  shop data doesn't contain that." plus the `message` and `suggestions` chips.
- error: red card, plain-language `message`, the failing SQL and raw `error_detail` inside a
  collapsed "Technical details" section, and a "Try again" button.
- network failure / backend down / timeout: same error card style, "Can't reach the server",
  retry button. The app must never crash or show a blank page; wrap the feed in an error
  boundary.

HISTORY SIDEBAR: every question this session with a small status icon (✓ ok, ∅ empty,
? clarify, ⛔ refused, ! error) and time. Clicking scrolls to that answer card. Keep in
sessionStorage (wrapped in try/catch). "Clear history" button.

EXTRA: a "Data" button opening a sheet that shows the schema from GET /api/schema (tables,
columns, short descriptions) in plain words.

API CONTRACT (TypeScript types to create exactly):

POST /api/ask
request:  { question: string, history: { question: string, sql: string | null }[] }

POST /api/run-sql
request:  { sql: string }

Both return AskResponse:
type ColumnType = "money" | "number" | "date" | "month" | "text";
interface AskResponse {
  status: "ok" | "empty" | "clarify" | "refused" | "error";
  reason?: "write_operation" | "not_available";      // only for refused
  question: string;
  sql: string | null;
  interpretation?: string | null;
  summary?: string | null;
  message?: string | null;                              // user-facing text for non-ok states
  options?: string[];                                   // clarify choices
  suggestions?: string[];                               // follow-up question chips
  columns: { name: string; label: string; type: ColumnType }[];
  rows: (string | number | null)[][];                   // dates as ISO strings
  row_count: number;
  truncated: boolean;
  chart?: { type: "line" | "bar"; x: string; y: string[] } | null;
  attempts?: { sql: string; error: string | null }[];
  error_detail?: string | null;
  elapsed_ms?: number;
}

GET /api/schema → { tables: { name: string; description: string;
                    columns: { name: string; type: string; description: string }[] }[] }
GET /api/health → { ok: boolean, db: boolean, llm_model: string }

Visual style: calm and trustworthy. White/neutral background, one accent color (teal),
rounded-2xl cards, generous spacing, readable 16px body text, accessible contrast in both
themes. Keep copy short and friendly.
````
