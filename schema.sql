-- Small online shop. PostgreSQL.
-- Business rule: revenue and spending count ONLY orders with status = 'paid'.
-- All money is in VND.

DROP TABLE IF EXISTS order_items, orders, products, customers;

CREATE TABLE customers (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    city        TEXT NOT NULL,            -- 'Ha Noi', 'TP.HCM', 'Da Nang', 'Can Tho'
    created_at  DATE NOT NULL
);

CREATE TABLE products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,            -- 'drink', 'snack', 'household', 'personal care'
    price_vnd   INTEGER NOT NULL          -- current list price
);

CREATE TABLE orders (
    id           INTEGER PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(id),
    order_date   DATE NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'cancelled'))
);

CREATE TABLE order_items (
    id              INTEGER PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id),
    product_id      INTEGER NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_vnd  INTEGER NOT NULL      -- price at time of order (may include a discount)
);
