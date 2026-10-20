export type ColumnType = "money" | "number" | "date" | "month" | "text";

export interface HistoryTurn {
  question: string;
  sql: string | null;
  /** What the owner saw, so follow-ups like "khách đó" can be resolved. */
  status?: AskResponse["status"];
  answer?: string | null;
  options?: string[];
  columns?: string[];
  /** First rows of the result only. */
  rows?: (string | number | null)[][];
}

export interface AskRequest {
  question: string;
  history: HistoryTurn[];
}

export interface AskResponse {
  /** "multi": the question had several independent asks; each is answered in `parts`. */
  /** "info": a general question ("bạn làm được gì?"); answered with `message`, `tables`, `suggestions`. */
  status: "ok" | "empty" | "clarify" | "refused" | "error" | "multi" | "info";
  reason?: "write_operation" | "not_available";
  question: string;
  sql: string | null;
  /** Defaults the AI assumed, e.g. "Tính trên toàn bộ dữ liệu". */
  interpretation?: string | null;
  /** Plain-Vietnamese reasoning steps, shown behind "Xem cách tôi tìm câu trả lời". */
  steps?: string[];
  summary?: string | null;
  message?: string | null;
  options?: string[];
  suggestions?: string[];
  columns: { name: string; label: string; type: ColumnType }[];
  rows: (string | number | null)[][];
  row_count: number;
  truncated: boolean;
  chart?: { type: "line" | "bar"; x: string; y: string[] } | null;
  attempts?: { sql: string; error: string | null }[];
  error_detail?: string | null;
  /** Only for status "multi": one full answer per sub-question, each with its own SQL. */
  parts?: AskResponse[];
  /** Only for status "info": what data the app can read, in plain Vietnamese. */
  tables?: SchemaResponse["tables"];
  elapsed_ms?: number;
}

export interface SchemaResponse {
  tables: {
    name: string;
    description: string;
    columns: { name: string; type: string; description: string }[];
  }[];
}

export interface HealthResponse {
  ok: boolean;
  db: boolean;
  llm_model: string;
}

/** Client-side network failure (backend down, timeout). */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}
