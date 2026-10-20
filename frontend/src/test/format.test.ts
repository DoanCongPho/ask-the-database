import { describe, it, expect } from "vitest";
import { formatCell, humanize } from "@/lib/format";

describe("formatCell", () => {
  it("formats money with en-US grouping and ₫ suffix", () => {
    expect(formatCell(1234000, "money")).toBe("1,234,000 ₫");
  });
  it("formats numbers with max 2 decimals", () => {
    expect(formatCell(1234.5678, "number")).toBe("1,234.57");
  });
  it("formats dates and months", () => {
    expect(formatCell("2026-10-12", "date")).toBe("12/10/2026");
    expect(formatCell("2025-03-01", "date")).toBe("01/03/2025");
    expect(formatCell("2025-10-01", "month")).toBe("Tháng 10/2025");
    expect(formatCell("2025-10-01T00:00:00", "month")).toBe("Tháng 10/2025");
  });
  it("returns null for null", () => {
    expect(formatCell(null, "text")).toBeNull();
  });
});

describe("humanize", () => {
  it("turns snake_case into friendly headers", () => {
    expect(humanize("total_spending_vnd")).toBe("Total Spending");
  });
});
