"""Plain-Vietnamese description of the 4 tables, for /api/schema and for "info" answers."""

SCHEMA_INFO = {"tables": [
    {"name": "customers", "description": "Khách hàng", "columns": [
        {"name": "id", "type": "integer", "description": "Mã khách hàng"},
        {"name": "name", "type": "text", "description": "Tên khách hàng"},
        {"name": "city", "type": "text", "description": "Thành phố: Ha Noi, TP.HCM, Da Nang, Can Tho"},
        {"name": "created_at", "type": "date", "description": "Ngày đăng ký"}]},
    {"name": "products", "description": "Sản phẩm", "columns": [
        {"name": "id", "type": "integer", "description": "Mã sản phẩm"},
        {"name": "name", "type": "text", "description": "Tên sản phẩm"},
        {"name": "category", "type": "text", "description": "Danh mục: drink, snack, household, personal care"},
        {"name": "price_vnd", "type": "integer", "description": "Giá bán hiện tại"}]},
    {"name": "orders", "description": "Đơn hàng", "columns": [
        {"name": "id", "type": "integer", "description": "Mã đơn hàng"},
        {"name": "customer_id", "type": "integer", "description": "Khách đặt đơn"},
        {"name": "order_date", "type": "date", "description": "Ngày đặt"},
        {"name": "status", "type": "text", "description": "Trạng thái: paid (đã thanh toán), pending (chờ), cancelled (đã hủy)"}]},
    {"name": "order_items", "description": "Sản phẩm trong từng đơn", "columns": [
        {"name": "order_id", "type": "integer", "description": "Thuộc đơn hàng nào"},
        {"name": "product_id", "type": "integer", "description": "Sản phẩm nào"},
        {"name": "quantity", "type": "integer", "description": "Số lượng"},
        {"name": "unit_price_vnd", "type": "integer", "description": "Giá lúc mua (có thể đã giảm giá)"}]},
]}

SCHEMA_INFO_EN = {"tables": [
    {"name": "customers", "description": "Customers", "columns": [
        {"name": "id", "type": "integer", "description": "Customer ID"},
        {"name": "name", "type": "text", "description": "Customer name"},
        {"name": "city", "type": "text", "description": "City: Ha Noi, TP.HCM, Da Nang, Can Tho"},
        {"name": "created_at", "type": "date", "description": "Sign-up date"}]},
    {"name": "products", "description": "Products", "columns": [
        {"name": "id", "type": "integer", "description": "Product ID"},
        {"name": "name", "type": "text", "description": "Product name"},
        {"name": "category", "type": "text", "description": "Category: drink, snack, household, personal care"},
        {"name": "price_vnd", "type": "integer", "description": "Current list price"}]},
    {"name": "orders", "description": "Orders", "columns": [
        {"name": "id", "type": "integer", "description": "Order ID"},
        {"name": "customer_id", "type": "integer", "description": "Customer who ordered"},
        {"name": "order_date", "type": "date", "description": "Order date"},
        {"name": "status", "type": "text", "description": "Status: paid, pending, cancelled"}]},
    {"name": "order_items", "description": "Products in each order", "columns": [
        {"name": "order_id", "type": "integer", "description": "Which order"},
        {"name": "product_id", "type": "integer", "description": "Which product"},
        {"name": "quantity", "type": "integer", "description": "Quantity"},
        {"name": "unit_price_vnd", "type": "integer", "description": "Price paid (may be discounted)"}]},
]}


def schema_info(lang: str) -> dict:
    return SCHEMA_INFO_EN if lang == "en" else SCHEMA_INFO
