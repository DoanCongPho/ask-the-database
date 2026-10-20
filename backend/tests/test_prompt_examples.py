import pytest

from app.prompt import EXAMPLES
from app.safety import check_sql

SQL_EXAMPLES = [(q, a) for q, a in EXAMPLES if a["kind"] == "sql"]
TEST_QUESTIONS = [
    "How many customers are there?", "Top 3 customers by total spending", "Customers who never placed an order",
    "Monthly revenue in 2025", "List all orders from 2024", "Show employee salaries",
    "Delete all cancelled orders", "What is the best product?",
]


@pytest.mark.parametrize("question,answer", SQL_EXAMPLES, ids=[q for q, _ in SQL_EXAMPLES])
def test_example_sql_runs_and_matches_declared_columns(database, question, answer):
    r = database.run_select(check_sql(answer["sql"]))
    assert r.rows, "an example should return data, otherwise it teaches nothing"
    assert [c for c, _ in r.columns] == [c["name"] for c in answer["columns"]]
    chart = answer.get("chart")
    if chart:
        assert chart["x"] in answer["sql"] and all(y in answer["sql"] for y in chart["y"])


def test_examples_are_not_the_test_questions():
    example_qs = {q.lower() for q, _ in EXAMPLES}
    assert not example_qs & {q.lower() for q in TEST_QUESTIONS}
