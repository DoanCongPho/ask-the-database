import {
  NetworkError,
  type AskRequest,
  type AskResponse,
  type HealthResponse,
  type SchemaResponse,
} from "./types";
import { mockAsk, mockSchema } from "./mock";

const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) || "http://localhost:8000";
export const USE_MOCK = import.meta.env["VITE_USE_MOCK"] === "true";
const TIMEOUT_MS = 60_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: ctrl.signal,
    });
    if (!res.ok && res.status >= 500 && !res.headers.get("content-type")?.includes("json")) {
      throw new NetworkError(`Máy chủ trả về lỗi ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof NetworkError) throw e;
    if ((e as Error)?.name === "AbortError") throw new NetworkError("Yêu cầu quá thời gian chờ.");
    throw new NetworkError((e as Error)?.message || "Lỗi kết nối");
  } finally {
    clearTimeout(timer);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ask(body: AskRequest): Promise<AskResponse> {
  if (USE_MOCK) {
    await delay(1400);
    return mockAsk(body);
  }
  return request<AskResponse>("/api/ask", { method: "POST", body: JSON.stringify(body) });
}

export async function getSchema(): Promise<SchemaResponse> {
  if (USE_MOCK) {
    await delay(300);
    return mockSchema();
  }
  return request<SchemaResponse>("/api/schema");
}

export async function getHealth(): Promise<HealthResponse> {
  if (USE_MOCK) return { ok: true, db: true, llm_model: "mock" };
  return request<HealthResponse>("/api/health");
}
