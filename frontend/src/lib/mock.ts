import { NetworkError, type AskRequest, type AskResponse, type SchemaResponse } from "./types";

// Sample responses for VITE_USE_MOCK=true. Tables, columns, names and products match schema.sql/seed.sql;
// the numbers are illustrative, not real query results.

const at = <T>(a: T[], i: number): T => a[i % a.length]!;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const NAMES = [
  "Tran Linh",
  "Pham Thao",
  "Ngo Quan",
  "Pham An",
  "Hoang Dung",
  "Bui Tuan",
  "Dang Khanh",
  "Le Minh",
  "Vu Hanh",
  "Do Phuong",
];
const CITIES = ["Ha Noi", "TP.HCM", "Da Nang", "Can Tho"];
const STATUSES = ["paid", "paid", "paid", "pending", "cancelled"];

const base = (q: string): AskResponse => ({
  status: "ok",
  question: q,
  sql: null,
  columns: [],
  rows: [],
  row_count: 0,
  truncated: false,
  elapsed_ms: 40 + Math.floor(Math.random() * 200),
});

function allOrders(q: string): AskResponse {
  const r = rng(7);
  const rows: (string | number | null)[][] = [];
  for (let i = 0; i < 700; i++) {
    const d = new Date(Date.UTC(2025, 0, 1) + Math.floor(r() * 650) * 86400000);
    rows.push([
      700 - i,
      at(NAMES, Math.floor(r() * NAMES.length)),
      at(CITIES, Math.floor(r() * 4)),
      d.toISOString().slice(0, 10),
      at(STATUSES, Math.floor(r() * 5)),
      Math.round((r() * 900_000) / 1000) * 1000 + 20_000,
    ]);
  }
  return {
    ...base(q),
    summary: "Cửa hàng có 700 đơn hàng, mới nhất ở trên cùng.",
    steps: [
      "Tôi lấy tất cả đơn hàng, kèm tên và thành phố của khách.",
      "Tôi tính tổng tiền mỗi đơn từ các sản phẩm trong đơn.",
      "Tôi sắp xếp đơn mới nhất lên đầu.",
    ],
    sql: "SELECT o.id AS order_id, c.name AS customer, c.city, o.order_date, o.status,\n       SUM(oi.quantity * oi.unit_price_vnd) AS order_total_vnd\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN order_items oi ON oi.order_id = o.id\nGROUP BY o.id, c.name, c.city\nORDER BY o.order_date DESC, o.id DESC;",
    columns: [
      { name: "order_id", label: "Mã đơn", type: "number" },
      { name: "customer", label: "Khách hàng", type: "text" },
      { name: "city", label: "Thành phố", type: "text" },
      { name: "order_date", label: "Ngày đặt", type: "date" },
      { name: "status", label: "Trạng thái", type: "text" },
      { name: "order_total_vnd", label: "Tổng tiền", type: "money" },
    ],
    rows,
    row_count: rows.length,
    suggestions: ["Chỉ đơn đã thanh toán", "Chỉ năm 2026", "Đơn hàng ở Ha Noi"],
  };
}

export function mockAsk({ question, history }: AskRequest): AskResponse {
  const q = question.toLowerCase();
  if (q.includes("offline") || q.includes("server down")) throw new NetworkError("Failed to fetch");
  if (/\b(delete|drop|update|insert)\b|xóa|xoá|sửa giá/.test(q)) {
    return {
      ...base(question),
      status: "refused",
      reason: "write_operation",
      message:
        "Ứng dụng chỉ xem dữ liệu nên dữ liệu của bạn luôn an toàn. Bạn có thể xem danh sách đơn đã hủy thay vì xóa.",
      suggestions: ["Danh sách đơn hàng đã hủy", "Có bao nhiêu đơn bị hủy?"],
    };
  }
  if (
    /làm (được )?gì|giúp (được )?gì|những bảng|thông tin gì|what can|help|xin chào|hello/.test(q)
  ) {
    return {
      ...base(question),
      status: "info",
      message:
        "Tôi trả lời câu hỏi về cửa hàng của bạn bằng lời thường: khách hàng, sản phẩm, đơn hàng và doanh thu. Tôi chỉ xem dữ liệu, không thêm, sửa hay xóa gì.",
      tables: mockSchema().tables,
      suggestions: [
        "Doanh thu theo tháng năm 2026",
        "Top 3 khách hàng chi tiêu nhiều nhất",
        "Khách hàng chưa từng đặt hàng",
      ],
    };
  }
  // Two independent asks ("khách ... và sản phẩm ...") are answered as separate parts.
  if (q.includes(" và ") && q.includes("khách") && q.includes("sản phẩm")) {
    const parts = ["Top 3 khách hàng chi tiêu nhiều nhất", "Top 5 sản phẩm theo doanh thu"];
    return {
      ...base(question),
      status: "multi",
      message: "Câu hỏi có hai ý khác nhau nên tôi trả lời từng ý riêng.",
      parts: parts.map((p) => mockAsk({ question: p, history })),
    };
  }
  if (
    q.includes("salar") ||
    q.includes("employee") ||
    q.includes("nhân viên") ||
    q.includes("lương")
  ) {
    return {
      ...base(question),
      status: "refused",
      reason: "not_available",
      message:
        "Dữ liệu chỉ có khách hàng, sản phẩm, đơn hàng và chi tiết đơn hàng, không có thông tin nhân viên hay lương.",
      suggestions: ["Có bao nhiêu khách hàng?", "Doanh thu theo thành phố"],
    };
  }
  if (q.includes("2024")) {
    return {
      ...base(question),
      status: "empty",
      sql: "SELECT o.id, o.order_date, o.status\nFROM orders o\nWHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01'\nORDER BY o.order_date;",
      steps: ["Tôi tìm các đơn hàng có ngày đặt trong năm 2024."],
      message: "Không có đơn hàng nào trong năm 2024. Dữ liệu đơn hàng bắt đầu từ 01/01/2025.",
      suggestions: ["Đơn hàng năm 2025", "Doanh thu theo tháng năm 2025"],
      columns: [
        { name: "id", label: "Mã đơn", type: "number" },
        { name: "order_date", label: "Ngày đặt", type: "date" },
        { name: "status", label: "Trạng thái", type: "text" },
      ],
    };
  }
  if (
    q.includes("best product") ||
    q.includes("tốt nhất") ||
    q.includes("yêu thích") ||
    q.includes("bán chạy")
  ) {
    return {
      ...base(question),
      status: "clarify",
      message:
        "“Tốt nhất” có thể hiểu theo nhiều cách. Bạn muốn xếp hạng sản phẩm theo tiêu chí nào?",
      options: ["Theo doanh thu", "Theo số lượng bán ra", "Theo số khách hàng đã mua"],
    };
  }
  if (q.includes("error") || q.includes("lỗi")) {
    return {
      ...base(question),
      status: "error",
      sql: "SELECT region, SUM(total) FROM sales GROUP BY region;",
      message:
        "Tôi chưa viết được truy vấn đúng cho câu này dù đã thử lại 3 lần. Bạn thử hỏi cụ thể hơn nhé.",
      error_detail:
        'psycopg.errors.UndefinedTable: relation "sales" does not exist\nLINE 1: SELECT region, SUM(total) FROM sales GROUP BY region;',
      attempts: [
        {
          sql: "SELECT region, SUM(total) FROM sales GROUP BY region;",
          error: 'relation "sales" does not exist',
        },
      ],
    };
  }
  if (q.includes("how many customers") || q.includes("bao nhiêu khách")) {
    return {
      ...base(question),
      summary: "Cửa hàng có 100 khách hàng.",
      steps: ["Tôi đếm tất cả khách hàng trong danh sách khách hàng."],
      sql: "SELECT COUNT(*) AS customer_count\nFROM customers;",
      columns: [{ name: "customer_count", label: "Số khách hàng", type: "number" }],
      rows: [[100]],
      row_count: 1,
      suggestions: ["Chia theo thành phố", "Khách mới trong năm 2026"],
    };
  }
  if (q.includes("top 3") || q.includes("spending") || q.includes("chi tiêu")) {
    return {
      ...base(question),
      summary: "Khách chi tiêu nhiều nhất là Bui Tuan với 9,840,000 ₫.",
      interpretation: "chỉ tính đơn đã thanh toán, trên toàn bộ dữ liệu.",
      steps: [
        "Tôi chỉ lấy các đơn hàng đã thanh toán.",
        "Tôi cộng tiền các sản phẩm trong những đơn đó cho từng khách hàng.",
        "Tôi sắp xếp từ cao xuống thấp và lấy 3 khách đầu tiên.",
      ],
      sql: "SELECT c.name, c.city, SUM(oi.quantity * oi.unit_price_vnd) AS total_spending_vnd\nFROM customers c\nJOIN orders o ON o.customer_id = c.id AND o.status = 'paid'\nJOIN order_items oi ON oi.order_id = o.id\nGROUP BY c.id, c.name, c.city\nORDER BY total_spending_vnd DESC\nLIMIT 3;",
      columns: [
        { name: "name", label: "Khách hàng", type: "text" },
        { name: "city", label: "Thành phố", type: "text" },
        { name: "total_spending_vnd", label: "Tổng chi tiêu", type: "money" },
      ],
      rows: [
        ["Bui Tuan", "TP.HCM", 9840000],
        ["Tran Linh", "Ha Noi", 8915000],
        ["Dang Khanh", "Da Nang", 8370000],
      ],
      row_count: 3,
      chart: { type: "bar", x: "name", y: ["total_spending_vnd"] },
      attempts: [
        {
          sql: "SELECT c.full_name, SUM(oi.quantity * oi.unit_price_vnd) FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'paid' GROUP BY 1 ORDER BY 2 DESC LIMIT 3;",
          error: "column c.full_name does not exist",
        },
        {
          sql: "SELECT c.name, c.city, SUM(oi.quantity * oi.unit_price_vnd) AS total_spending_vnd ...",
          error: null,
        },
      ],
      suggestions: ["Xem top 10", "Chỉ năm 2026"],
    };
  }
  if (q.includes("never") || q.includes("chưa từng")) {
    return {
      ...base(question),
      summary: "Có 8 khách hàng chưa từng đặt đơn nào.",
      steps: [
        "Tôi lấy danh sách tất cả khách hàng.",
        "Tôi giữ lại những khách không có đơn hàng nào (kể cả đơn chờ hay đã hủy).",
      ],
      sql: "SELECT c.name, c.city, c.created_at\nFROM customers c\nWHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)\nORDER BY c.created_at;",
      columns: [
        { name: "name", label: "Khách hàng", type: "text" },
        { name: "city", label: "Thành phố", type: "text" },
        { name: "created_at", label: "Ngày đăng ký", type: "date" },
      ],
      rows: NAMES.slice(0, 8).map((n, i) => [n, at(CITIES, i), `2025-0${(i % 9) + 1}-1${i}`]),
      row_count: 8,
      suggestions: ["Chỉ khách ở TP.HCM", "Khách chưa có đơn đã thanh toán"],
    };
  }
  if (
    q.includes("monthly") ||
    q.includes("theo tháng") ||
    (q.includes("2026") && history.length > 0)
  ) {
    const year = q.includes("2026") ? 2026 : 2025;
    const months = year === 2026 ? 10 : 12;
    const r = rng(year);
    const rows = Array.from({ length: months }, (_, i) => [
      `${year}-${String(i + 1).padStart(2, "0")}-01`,
      Math.round((14 + r() * 8 + i * 0.4) * 1e6),
      Math.round(20 + r() * 12),
    ]);
    const total = rows.reduce((s, x) => s + (x[1] as number), 0);
    return {
      ...base(question),
      summary: `Doanh thu năm ${year} là ${new Intl.NumberFormat("en-US").format(total)} ₫.`,
      interpretation: "doanh thu chỉ tính đơn đã thanh toán.",
      steps: [
        `Tôi lấy các đơn hàng đã thanh toán trong năm ${year}.`,
        "Tôi cộng tiền các sản phẩm trong đơn theo từng tháng.",
        "Tôi đếm thêm số đơn mỗi tháng để bạn dễ so sánh.",
      ],
      sql: `SELECT date_trunc('month', o.order_date)::date AS month,\n       SUM(oi.quantity * oi.unit_price_vnd) AS revenue_vnd,\n       COUNT(DISTINCT o.id) AS paid_orders\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'paid'\n  AND o.order_date >= '${year}-01-01' AND o.order_date < '${year + 1}-01-01'\nGROUP BY 1\nORDER BY 1;`,
      columns: [
        { name: "month", label: "Tháng", type: "month" },
        { name: "revenue_vnd", label: "Doanh thu", type: "money" },
        { name: "paid_orders", label: "Số đơn", type: "number" },
      ],
      rows,
      row_count: rows.length,
      chart: { type: "line", x: "month", y: ["revenue_vnd"] },
      suggestions:
        year === 2025 ? ["Chỉ năm 2026", "Chia theo danh mục sản phẩm"] : ["So sánh với năm 2025"],
    };
  }
  if (q.includes("city") || q.includes("thành phố")) {
    const vals = [118_400_000, 102_750_000, 61_300_000, 44_900_000];
    return {
      ...base(question),
      summary: "Ha Noi mang lại doanh thu cao nhất.",
      interpretation: "chỉ tính đơn đã thanh toán, trên toàn bộ dữ liệu.",
      steps: [
        "Tôi lấy các đơn hàng đã thanh toán.",
        "Tôi gom các đơn theo thành phố của khách hàng.",
        "Tôi cộng doanh thu từng thành phố và sắp xếp từ cao xuống thấp.",
      ],
      sql: "SELECT c.city, SUM(oi.quantity * oi.unit_price_vnd) AS revenue_vnd\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'paid'\nGROUP BY c.city\nORDER BY revenue_vnd DESC;",
      columns: [
        { name: "city", label: "Thành phố", type: "text" },
        { name: "revenue_vnd", label: "Doanh thu", type: "money" },
      ],
      rows: CITIES.map((c, i) => [c, at(vals, i)]),
      row_count: 4,
      chart: { type: "bar", x: "city", y: ["revenue_vnd"] },
      suggestions: ["Chỉ năm 2026", "Theo tháng"],
    };
  }
  if (
    q.includes("doanh thu") ||
    q.includes("revenue") ||
    q.includes("số lượng") ||
    q.includes("khách hàng đã mua")
  ) {
    return {
      ...base(question),
      summary: "Sản phẩm mang lại doanh thu cao nhất là Rice cooker.",
      interpretation: "chỉ tính đơn đã thanh toán, lấy 5 sản phẩm đầu.",
      steps: [
        "Tôi lấy các sản phẩm trong những đơn đã thanh toán.",
        "Tôi cộng số lượng bán và doanh thu cho từng sản phẩm.",
        "Tôi sắp xếp theo doanh thu và lấy 5 sản phẩm cao nhất.",
      ],
      sql: "SELECT p.name, p.category, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price_vnd) AS revenue_vnd\nFROM order_items oi\nJOIN orders o ON o.id = oi.order_id AND o.status = 'paid'\nJOIN products p ON p.id = oi.product_id\nGROUP BY p.id, p.name, p.category\nORDER BY revenue_vnd DESC\nLIMIT 5;",
      columns: [
        { name: "name", label: "Sản phẩm", type: "text" },
        { name: "category", label: "Danh mục", type: "text" },
        { name: "units_sold", label: "Số lượng bán", type: "number" },
        { name: "revenue_vnd", label: "Doanh thu", type: "money" },
      ],
      rows: [
        ["Rice cooker", "household", 52, 44_500_000],
        ["Sunscreen 50ml", "personal care", 131, 30_100_000],
        ["Cashew nuts 500g", "snack", 118, 23_600_000],
        ["Ground coffee 500g", "drink", 104, 18_700_000],
        ["Body wash 900ml", "personal care", 96, 14_900_000],
      ],
      row_count: 5,
      chart: { type: "bar", x: "name", y: ["revenue_vnd"] },
      suggestions: ["Theo số lượng bán ra", "Chỉ năm 2026"],
    };
  }
  if (q.includes("all orders") || q.includes("đơn hàng")) return allOrders(question);
  return {
    ...base(question),
    status: "clarify",
    message: "Tôi chưa chắc bạn muốn xem gì. Bạn chọn một trong các câu sau nhé:",
    options: ["Có bao nhiêu khách hàng?", "Doanh thu theo tháng năm 2025", "Danh sách đơn hàng"],
  };
}

export function mockSchema(): SchemaResponse {
  return {
    tables: [
      {
        name: "customers",
        description: "Khách hàng",
        columns: [
          { name: "id", type: "integer", description: "Mã khách hàng" },
          { name: "name", type: "text", description: "Tên khách hàng" },
          {
            name: "city",
            type: "text",
            description: "Thành phố: Ha Noi, TP.HCM, Da Nang, Can Tho",
          },
          { name: "created_at", type: "date", description: "Ngày đăng ký" },
        ],
      },
      {
        name: "products",
        description: "Sản phẩm",
        columns: [
          { name: "id", type: "integer", description: "Mã sản phẩm" },
          { name: "name", type: "text", description: "Tên sản phẩm" },
          {
            name: "category",
            type: "text",
            description: "Danh mục: drink, snack, household, personal care",
          },
          { name: "price_vnd", type: "integer", description: "Giá bán hiện tại" },
        ],
      },
      {
        name: "orders",
        description: "Đơn hàng",
        columns: [
          { name: "id", type: "integer", description: "Mã đơn hàng" },
          { name: "customer_id", type: "integer", description: "Khách đặt đơn" },
          { name: "order_date", type: "date", description: "Ngày đặt" },
          {
            name: "status",
            type: "text",
            description: "Trạng thái: paid (đã thanh toán), pending (chờ), cancelled (đã hủy)",
          },
        ],
      },
      {
        name: "order_items",
        description: "Sản phẩm trong từng đơn",
        columns: [
          { name: "order_id", type: "integer", description: "Thuộc đơn hàng nào" },
          { name: "product_id", type: "integer", description: "Sản phẩm nào" },
          { name: "quantity", type: "integer", description: "Số lượng" },
          {
            name: "unit_price_vnd",
            type: "integer",
            description: "Giá lúc mua (có thể đã giảm giá)",
          },
        ],
      },
    ],
  };
}
