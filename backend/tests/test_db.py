import psycopg
import pytest


def test_select_works_and_formats_values(database):
    r = database.run_select("SELECT date_trunc('month', order_date) AS m, COUNT(*) AS n FROM orders GROUP BY 1 ORDER BY 1 LIMIT 1")
    assert r.columns == [("m", "date"), ("n", "number")]
    assert r.rows[0][0] == "2025-01-01"  # timestamp at midnight -> plain date string


def test_row_cap_sets_truncated(database):
    r = database.run_select("SELECT id FROM order_items", max_rows=100)
    assert len(r.rows) == 100 and r.truncated


@pytest.mark.parametrize("sql", [
    "DELETE FROM orders WHERE status = 'cancelled'",
    "UPDATE products SET price_vnd = 0",
    "CREATE TABLE x (id int)",
])
def test_database_refuses_writes_even_without_the_validator(database, sql):
    # Calls the executor directly, skipping check_sql, to prove the DB layer holds on its own.
    with pytest.raises(psycopg.Error):
        database.run_select(sql)
    assert database.run_select("SELECT COUNT(*) FROM orders").rows[0][0] == 700
    assert database.run_select("SELECT MIN(price_vnd) FROM products").rows[0][0] > 0


def test_statement_timeout(database):
    with pytest.raises(psycopg.errors.QueryCanceled):
        database.run_select("SELECT pg_sleep(10)")
