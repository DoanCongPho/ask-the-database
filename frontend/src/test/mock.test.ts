import { describe, expect, it } from "vitest";
import { mockAsk } from "@/lib/mock";

describe("mockAsk split answers", () => {
  it("answers a two-part question with one full answer per part", () => {
    const r = mockAsk({
      question: "Khách hàng mua nhiều nhất và sản phẩm bán nhiều nhất",
      history: [],
    });
    expect(r.status).toBe("multi");
    expect(r.parts?.map((p) => p.status)).toEqual(["ok", "ok"]);
    expect(r.parts?.every((p) => p.sql)).toBe(true);
  });
});

describe("mockAsk info answers", () => {
  it("answers 'what can you do' with the tables and example questions", () => {
    const r = mockAsk({ question: "Bạn làm được gì cho tôi?", history: [] });
    expect(r.status).toBe("info");
    expect(r.tables?.map((t) => t.name)).toEqual([
      "customers",
      "products",
      "orders",
      "order_items",
    ]);
    expect(r.suggestions?.length).toBeGreaterThan(0);
  });
});
