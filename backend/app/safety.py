"""Static check of LLM-written SQL before it reaches the database.

This is one layer of several (see README / docs/PIPELINE.md): the DB role is SELECT-only and every query
also runs in a READ ONLY transaction, so this check is not the only thing standing
between the LLM and the data. Its job is to refuse early with a clear reason.
"""

import sqlglot
from sqlglot import exp

ALLOWED_TABLES = {"customers", "products", "orders", "order_items"}

# Nodes that change data or the session, wherever they appear (also inside CTEs).
_WRITE_NODES = (
    exp.Insert, exp.Update, exp.Delete, exp.Merge, exp.Create, exp.Drop, exp.Alter,
    exp.TruncateTable, exp.Copy, exp.Command, exp.Set, exp.Into, exp.Lock, exp.Grant,
)
_BLOCKED_FUNC_PREFIXES = ("pg_", "lo_", "dblink", "set_config", "current_setting", "query_to_xml", "txid_")


class UnsafeSQL(Exception):
    """The SQL tries to write or touch something outside the shop tables. Never retried."""


class InvalidSQL(Exception):
    """The SQL is not usable (syntax, unknown table). The LLM may get a chance to fix it."""


def check_sql(sql: str) -> str:
    """Return the SQL to execute (trailing semicolons removed) or raise UnsafeSQL / InvalidSQL."""
    sql = sql.strip().rstrip(";").strip()
    if not sql:
        raise InvalidSQL("Empty SQL")
    try:
        statements = [s for s in sqlglot.parse(sql, read="postgres") if s is not None and not isinstance(s, exp.Semicolon)]
    except sqlglot.errors.ParseError as e:
        raise InvalidSQL(f"SQL syntax error: {str(e).splitlines()[0]}") from e

    if len(statements) != 1:
        raise UnsafeSQL("Only one statement is allowed")
    stmt = statements[0]

    for node in stmt.walk():
        if isinstance(node, _WRITE_NODES):
            raise UnsafeSQL(f"{type(node).__name__} is not allowed: the app is read-only")
    if not isinstance(stmt, (exp.Select, exp.SetOperation)):
        raise UnsafeSQL(f"Only SELECT queries are allowed, got {type(stmt).__name__}")

    for fn in stmt.find_all(exp.Func):
        name = (fn.name if isinstance(fn, exp.Anonymous) else fn.sql_name()).lower()
        if name.startswith(_BLOCKED_FUNC_PREFIXES):
            raise UnsafeSQL(f"Function {name}() is not allowed")

    cte_names = {cte.alias_or_name.lower() for cte in stmt.find_all(exp.CTE)}
    for table in stmt.find_all(exp.Table):
        schema, name = table.db.lower(), table.name.lower()
        if schema and schema != "public":
            raise UnsafeSQL(f"Schema {schema} is not allowed")
        if name not in ALLOWED_TABLES and name not in cte_names:
            raise InvalidSQL(f'Table "{name}" does not exist. Available tables: {", ".join(sorted(ALLOWED_TABLES))}')
    return sql
