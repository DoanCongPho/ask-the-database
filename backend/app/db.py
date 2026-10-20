"""Read-only query execution on PostgreSQL."""

import datetime as dt
from dataclasses import dataclass
from decimal import Decimal

from psycopg_pool import ConnectionPool

from .config import settings

pool = ConnectionPool(settings.database_url, min_size=1, max_size=5, open=False, timeout=3, kwargs={"connect_timeout": 3})

# Postgres type OIDs -> coarse kinds used for formatting.
_NUMERIC_OIDS = {20, 21, 23, 26, 700, 701, 1700}
_DATE_OIDS = {1082, 1114, 1184}


@dataclass
class QueryResult:
    columns: list[tuple[str, str]]  # (name, "number" | "date" | "text")
    rows: list[list]
    truncated: bool


def _json_value(v):
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, dt.datetime):
        return v.date().isoformat() if v.time() == dt.time(0) else v.isoformat(timespec="minutes")
    if isinstance(v, dt.date):
        return v.isoformat()
    if v is None or isinstance(v, (int, float, str, bool)):
        return v
    return str(v)


def run_select(sql: str, max_rows: int = settings.max_rows) -> QueryResult:
    """Run one SELECT in a READ ONLY transaction that is always rolled back.

    Raises psycopg errors (bad SQL, timeout) and psycopg_pool.PoolTimeout (DB down) to the caller.
    """
    with pool.connection() as conn:
        with conn.transaction(force_rollback=True):
            with conn.cursor() as cur:
                cur.execute("SET TRANSACTION READ ONLY")
                cur.execute(f"SET LOCAL statement_timeout = {int(settings.statement_timeout_ms)}")
                cur.execute(sql)
                if cur.description is None:
                    return QueryResult(columns=[], rows=[], truncated=False)
                columns = [
                    (d.name, "number" if d.type_code in _NUMERIC_OIDS else "date" if d.type_code in _DATE_OIDS else "text")
                    for d in cur.description
                ]
                fetched = cur.fetchmany(max_rows + 1)
    truncated = len(fetched) > max_rows
    rows = [[_json_value(v) for v in row] for row in fetched[:max_rows]]
    return QueryResult(columns=columns, rows=rows, truncated=truncated)


def ping() -> bool:
    try:
        with pool.connection(timeout=2) as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
