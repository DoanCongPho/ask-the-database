import type { Lang } from "./i18n";
import type { AskResponse, ColumnType } from "./types";

const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const pad = (n: number) => String(n).padStart(2, "0");

function parseDate(v: string | number): Date | null {
  // Use only the calendar part of "2025-10-01" or "2025-10-01T00:00:00" so the local timezone can't shift the day.
  const ymd = typeof v === "string" ? /^(\d{4}-\d{2}-\d{2})/.exec(v)?.[1] : undefined;
  const d = new Date(ymd ? `${ymd}T00:00:00Z` : v);
  return isNaN(d.getTime()) ? null : d;
}

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatCell(
  v: string | number | null,
  type: ColumnType,
  lang: Lang = "vi",
): string | null {
  if (v === null || v === undefined || v === "") return null;
  switch (type) {
    case "money": {
      const n = Number(v);
      return isNaN(n) ? String(v) : `${money.format(n)} ₫`;
    }
    case "number": {
      const n = Number(v);
      return isNaN(n) ? String(v) : num.format(n);
    }
    case "date": {
      const d = parseDate(v);
      return d
        ? `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
        : String(v);
    }
    case "month": {
      const d = parseDate(v);
      if (!d) return String(v);
      return lang === "en"
        ? `${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}`
        : `Tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
    }
    default:
      return String(v);
  }
}

export function compactMoney(n: number, lang: Lang = "vi"): string {
  if (Math.abs(n) >= 1e9) return `${num.format(n / 1e9)}${lang === "en" ? "B" : " tỷ"}`;
  if (Math.abs(n) >= 1e6) return `${num.format(n / 1e6)}${lang === "en" ? "M" : " tr"}`;
  if (Math.abs(n) >= 1e3) return `${num.format(n / 1e3)}k`;
  return num.format(n);
}

export function humanize(name: string): string {
  return name
    .replace(/_(vnd|id)$/i, (m) => (m.toLowerCase() === "_id" ? " ID" : ""))
    .split("_")
    .filter(Boolean)
    .map((w) => (w === "ID" ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function headerOf(c: { name: string; label: string }) {
  return c.label && c.label !== c.name ? c.label : humanize(c.name);
}

function csvEscape(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(r: AskResponse): string {
  const head = r.columns.map((c) => csvEscape(headerOf(c))).join(",");
  const body = r.rows.map((row) =>
    row.map((v) => (v === null ? "" : csvEscape(String(v)))).join(","),
  );
  return [head, ...body].join("\n");
}

export function toTsv(r: AskResponse, lang: Lang = "vi"): string {
  const head = r.columns.map(headerOf).join("\t");
  const body = r.rows.map((row) =>
    row.map((v, i) => formatCell(v, r.columns[i]!.type, lang) ?? "").join("\t"),
  );
  return [head, ...body].join("\n");
}

export function downloadCsv(r: AskResponse) {
  const blob = new Blob(["\uFEFF" + toCsv(r)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.question.slice(0, 40).replace(/[^\p{L}\p{N}]+/gu, "-") || "ket-qua"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
