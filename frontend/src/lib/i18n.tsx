import { createContext, useContext, type ReactNode } from "react";

/** UI language. Answers written by the AI follow the language of the question instead. */
export type Lang = "vi" | "en";

const vi = {
  appName: "Hỏi Cửa Hàng",
  shopData: "Dữ liệu cửa hàng",
  sampleData: "Dữ liệu mẫu",
  newChat: "Cuộc trò chuyện mới",
  conversations: "Các cuộc trò chuyện",
  historyEmpty: "Câu hỏi của bạn sẽ hiện ở đây.",
  clearAll: "Xóa tất cả",
  history: "Lịch sử câu hỏi",
  openHistory: "Mở lịch sử",
  data: "Dữ liệu",
  toggleTheme: "Đổi giao diện sáng/tối",
  switchLang: "Switch to English",
  hello: "Xin chào! 👋",
  intro: "Hỏi bất cứ điều gì về khách hàng, sản phẩm, đơn hàng và doanh thu của bạn.",
  dataAvailable: "Dữ liệu hiện có:",
  dataFacts: "100 khách hàng · 20 sản phẩm · 700 đơn hàng · 01/2025 – 10/2026",
  working: "Đang xử lý…",
  askPlaceholder: "Hỏi về khách hàng, sản phẩm, đơn hàng, doanh thu…",
  yourQuestion: "Câu hỏi của bạn",
  send: "Gửi",
  sendLabel: "Gửi: {label}",
  enterHint: "Enter để gửi · Shift+Enter để xuống dòng",
  renderErrorTitle: "Có lỗi khi hiển thị câu trả lời",
  renderErrorBody: "Lịch sử câu hỏi vẫn được giữ. Bấm tải lại để tiếp tục.",
  reload: "Tải lại",
  refineTitle: "Điều chỉnh câu trả lời",
  refinePlaceholder: "Ví dụ: chỉ năm 2026, xem top 10, chia theo thành phố…",
  loading1: "Đang hiểu câu hỏi…",
  loading2: "Đang viết truy vấn…",
  loading3: "Đang lấy dữ liệu…",
  techDetails: "Chi tiết kỹ thuật",
  note: "Lưu ý: {text}",
  retried: "Lần đầu truy vấn bị lỗi, tôi đã tự sửa lại ({n} lần).",
  chart: "Biểu đồ",
  table: "Bảng",
  copy: "Sao chép",
  copied: "Đã sao chép",
  copyTable: "Sao chép bảng",
  downloadCsv: "Tải CSV",
  showingFirst: "Hiển thị {n} dòng đầu tiên",
  rows: "{n} dòng",
  seconds: "{n} giây",
  emptyTitle: "Không tìm thấy kết quả",
  emptyDefault: "Truy vấn chạy thành công nhưng không có dòng dữ liệu nào.",
  clarifyTitle: "Bạn nói rõ hơn giúp tôi nhé",
  clarifyPlaceholder: "Hoặc tự ghi ý bạn, ví dụ: theo số lượng bán năm 2025",
  clarifyLabel: "Tự trả lời câu hỏi làm rõ",
  refusedWrite: "Tôi chỉ đọc dữ liệu, không thể thay đổi hay xóa.",
  refusedNotAvailable: "Dữ liệu cửa hàng không có thông tin này.",
  youCanAsk: "Bạn có thể hỏi:",
  errorTitle: "Đã có lỗi xảy ra",
  errorDefault: "Tôi chưa trả lời được câu này. Bạn thử hỏi theo cách khác nhé.",
  retry: "Thử lại",
  networkTitle: "Không kết nối được máy chủ",
  networkBody:
    "Tôi chưa lấy được dữ liệu cửa hàng. Bạn kiểm tra kết nối rồi thử lại sau ít phút nhé.",
  infoTitle: "Tôi có thể giúp bạn",
  dataIRead: "Dữ liệu tôi đọc được",
  tryAsking: "Bạn thử hỏi:",
  multiDefault: "Câu hỏi có {n} ý nên tôi trả lời từng ý riêng.",
  part: "Phần {n}: {q}",
  showSql: "Xem truy vấn SQL",
  fixedAfter: "Đã tự sửa sau {n} lần thử",
  showSteps: "Xem cách tôi tìm câu trả lời",
  page: "Trang {n}/{total}",
  prevPage: "Trang trước",
  nextPage: "Trang sau",
  schemaIntro: "Đây là những thông tin tôi dùng để trả lời câu hỏi của bạn.",
  loadingDots: "Đang tải…",
  schemaError: "Chưa kết nối được máy chủ để tải phần này.",
};

export type MessageKey = keyof typeof vi;

const en: Record<MessageKey, string> = {
  appName: "Ask Your Shop",
  shopData: "Shop data",
  sampleData: "Sample data",
  newChat: "New conversation",
  conversations: "Conversations",
  historyEmpty: "Your questions will appear here.",
  clearAll: "Clear all",
  history: "Question history",
  openHistory: "Open history",
  data: "Data",
  toggleTheme: "Toggle light/dark mode",
  switchLang: "Chuyển sang tiếng Việt",
  hello: "Hello! 👋",
  intro: "Ask anything about your customers, products, orders and revenue.",
  dataAvailable: "Data available:",
  dataFacts: "100 customers · 20 products · 700 orders · 01/2025 – 10/2026",
  working: "Working…",
  askPlaceholder: "Ask about customers, products, orders, revenue…",
  yourQuestion: "Your question",
  send: "Send",
  sendLabel: "Send: {label}",
  enterHint: "Enter to send · Shift+Enter for a new line",
  renderErrorTitle: "Something went wrong showing the answer",
  renderErrorBody: "Your question history is kept. Click reload to continue.",
  reload: "Reload",
  refineTitle: "Adjust the answer",
  refinePlaceholder: "E.g. only 2026, show top 10, split by city…",
  loading1: "Understanding the question…",
  loading2: "Writing the query…",
  loading3: "Fetching the data…",
  techDetails: "Technical details",
  note: "Note: {text}",
  retried: "The first query failed, so I fixed it ({n} retries).",
  chart: "Chart",
  table: "Table",
  copy: "Copy",
  copied: "Copied",
  copyTable: "Copy table",
  downloadCsv: "Download CSV",
  showingFirst: "Showing the first {n} rows",
  rows: "{n} rows",
  seconds: "{n} s",
  emptyTitle: "No results",
  emptyDefault: "The query ran fine but returned no rows.",
  clarifyTitle: "Could you be more specific?",
  clarifyPlaceholder: "Or type your own, e.g. by quantity sold in 2025",
  clarifyLabel: "Answer in your own words",
  refusedWrite: "I can only read the data, not change or delete it.",
  refusedNotAvailable: "The shop data doesn't have this information.",
  youCanAsk: "You could ask:",
  errorTitle: "Something went wrong",
  errorDefault: "I couldn't answer this one. Try asking it another way.",
  retry: "Try again",
  networkTitle: "Can't reach the server",
  networkBody: "I couldn't get the shop data. Check the connection and try again in a few minutes.",
  infoTitle: "How I can help",
  dataIRead: "Data I can read",
  tryAsking: "Try asking:",
  multiDefault: "Your question has {n} parts, so I answered each one separately.",
  part: "Part {n}: {q}",
  showSql: "Show SQL query",
  fixedAfter: "Fixed itself after {n} attempts",
  showSteps: "How I found the answer",
  page: "Page {n}/{total}",
  prevPage: "Previous page",
  nextPage: "Next page",
  schemaIntro: "This is the information I use to answer your questions.",
  loadingDots: "Loading…",
  schemaError: "Couldn't reach the server to load this.",
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { vi, en };

export const EXAMPLES: Record<Lang, string[]> = {
  vi: [
    "Có bao nhiêu khách hàng?",
    "Top 3 khách hàng chi tiêu nhiều nhất",
    "Khách hàng chưa từng đặt hàng",
    "Doanh thu theo tháng năm 2025",
    "Sản phẩm nào tốt nhất?",
    "Doanh thu theo thành phố",
  ],
  en: [
    "How many customers are there?",
    "Top 3 customers by total spending",
    "Customers who never placed an order",
    "Monthly revenue in 2025",
    "What is the best product?",
    "Revenue by city",
  ],
};

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>) {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (m, k: string) =>
    vars && k in vars ? String(vars[k]) : m,
  );
}

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<I18n>({
  lang: "vi",
  setLang: () => {},
  t: (key, vars) => translate("vi", key, vars),
});

export function I18nProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  children: ReactNode;
}) {
  const t: I18n["t"] = (key, vars) => translate(lang, key, vars);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
