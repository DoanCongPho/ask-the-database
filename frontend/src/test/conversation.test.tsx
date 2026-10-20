import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AskRequest, AskResponse } from "@/lib/types";

const requests: AskRequest[] = [];

vi.mock("@/lib/api", () => ({
  USE_MOCK: false,
  getSchema: vi.fn(),
  ask: vi.fn(async (body: AskRequest): Promise<AskResponse> => {
    requests.push(body);
    return {
      status: "ok",
      question: body.question,
      sql: `SELECT '${body.question}' AS q`,
      summary: `Trả lời: ${body.question}`,
      columns: [{ name: "name", label: "Tên", type: "text" }],
      rows: [["Dang Phuc"], ["Bui An"]],
      row_count: 2,
      truncated: false,
    };
  }),
}));

const { Route } = await import("@/routes/index");
const App = Route.options.component as ComponentType;

async function askQ(text: string) {
  fireEvent.change(screen.getByLabelText("Câu hỏi của bạn"), { target: { value: text } });
  fireEvent.click(screen.getByLabelText("Gửi"));
  await screen.findAllByText(`Trả lời: ${text}`);
}

describe("conversations", () => {
  beforeEach(() => {
    requests.length = 0;
    sessionStorage.clear();
    localStorage.clear();
  });

  it("sends earlier turns, with what the owner saw, as context for a follow-up", async () => {
    render(<App />);
    await askQ("Top 3 khách hàng chi tiêu nhiều nhất");
    await askQ("người đứng đầu ở đâu?");
    expect(requests[1]!.history).toEqual([
      expect.objectContaining({
        question: "Top 3 khách hàng chi tiêu nhiều nhất",
        sql: "SELECT 'Top 3 khách hàng chi tiêu nhiều nhất' AS q",
        status: "ok",
        answer: "Trả lời: Top 3 khách hàng chi tiêu nhiều nhất",
        columns: ["name"],
        rows: [["Dang Phuc"], ["Bui An"]],
      }),
    ]);
  });

  it("'Cuộc trò chuyện mới' opens an empty conversation and starts with no context", async () => {
    render(<App />);
    await askQ("Có bao nhiêu khách hàng?");
    fireEvent.click(screen.getAllByText("Cuộc trò chuyện mới")[0]!);
    // The welcome screen with example questions is back; the old answer is not shown.
    await waitFor(() => expect(screen.queryByText("Trả lời: Có bao nhiêu khách hàng?")).toBeNull());
    await askQ("Doanh thu theo tháng");
    expect(requests[1]!.history).toEqual([]);
    // The first conversation is still in the sidebar and can be reopened, with its context.
    fireEvent.click(screen.getAllByText("Có bao nhiêu khách hàng?")[0]!);
    await screen.findAllByText("Trả lời: Có bao nhiêu khách hàng?");
    await askQ("chỉ ở Ha Noi");
    expect(requests[2]!.history.map((h) => h.question)).toEqual(["Có bao nhiêu khách hàng?"]);
  });

  it("the language button switches the UI to English and sends lang with the question", async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("Switch to English"));
    await screen.findByText("Hello! 👋");
    expect(screen.getByText("How many customers are there?")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "Revenue by city" },
    });
    fireEvent.click(screen.getByLabelText("Send"));
    await screen.findAllByText("Trả lời: Revenue by city");
    expect(requests[0]!.lang).toBe("en");
    expect(screen.getByText("Adjust the answer")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Chuyển sang tiếng Việt"));
    await screen.findByText("Điều chỉnh câu trả lời");
  });
});
