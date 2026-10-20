import pytest

from app.safety import InvalidSQL, UnsafeSQL, check_sql

ALLOWED = [
    "SELECT COUNT(*) FROM customers",
    "SELECT COUNT(*) FROM customers;",
    "WITH t AS (SELECT customer_id, COUNT(*) n FROM orders GROUP BY 1) SELECT c.name, t.n FROM customers c JOIN t ON t.customer_id = c.id",
    "SELECT name FROM customers UNION SELECT name FROM products",
    "SELECT name FROM products WHERE name ILIKE '%coffee%'",
    "SELECT date_trunc('month', order_date)::date AS m, COUNT(*) FROM orders GROUP BY 1 ORDER BY 1",
    "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)",
    "SELECT * FROM public.orders -- trailing comment",
]

UNSAFE = [
    "DELETE FROM orders WHERE status = 'cancelled'",
    "UPDATE products SET price_vnd = 0",
    "INSERT INTO customers VALUES (999, 'x', 'Ha Noi', '2025-01-01')",
    "DROP TABLE orders",
    "TRUNCATE orders",
    "ALTER TABLE orders ADD COLUMN x int",
    "SELECT 1; DELETE FROM orders",
    "SELECT 1 /* hi */; DROP TABLE orders",
    "WITH d AS (DELETE FROM orders RETURNING *) SELECT * FROM d",
    "SELECT * INTO backup FROM orders",
    "SELECT * FROM orders FOR UPDATE",
    "SELECT pg_sleep(10)",
    "SELECT pg_read_file('/etc/passwd')",
    "SELECT set_config('default_transaction_read_only', 'off', false)",
    "SELECT dblink('host=x', 'select 1')",
    "SET default_transaction_read_only = off",
    "COPY orders TO PROGRAM 'ls'",
    "SELECT * FROM pg_catalog.pg_authid",
    "SELECT * FROM information_schema.tables",
]


@pytest.mark.parametrize("sql", ALLOWED)
def test_allows_read_queries(sql):
    assert check_sql(sql)


@pytest.mark.parametrize("sql", UNSAFE)
def test_blocks_writes_and_escapes(sql):
    with pytest.raises(UnsafeSQL):
        check_sql(sql)


@pytest.mark.parametrize("sql", ["SELEC 1", "", "SELECT salary FROM employees"])
def test_invalid_sql_is_retryable_not_unsafe(sql):
    with pytest.raises(InvalidSQL):
        check_sql(sql)


def test_strips_trailing_semicolon():
    assert check_sql("SELECT 1 FROM orders;  ") == "SELECT 1 FROM orders"
