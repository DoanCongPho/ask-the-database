"""Pipeline behavior with a scripted fake LLM (no API key needed) against the real read-only DB."""

import json

import pytest
from fastapi.testclient import TestClient

from app import llm, pipeline
from app.main import app


class FakeLLM:
    def __init__(self, *answers):
        self.answers = list(answers)
        self.calls = []

    def __call__(self, messages, temperature=0):
        self.calls.append(messages)
        if messages[0]["content"].startswith("Bạn viết MỘT câu tóm tắt"):
            return {"summary": "Tóm tắt thử."}
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


@pytest.fixture
def fake(monkeypatch, database):
    def install(*answers):
        f = FakeLLM(*answers)
        monkeypatch.setattr(llm, "chat_json", f)
        return f
    return install


def orders_count(database):
    return database.run_select("SELECT COUNT(*) FROM orders").rows[0][0]


def test_ok_answer_with_columns_chart_and_summary(fake):
    fake({"kind": "sql", "steps": ["Tôi đếm khách theo thành phố."], "sql": "SELECT city, COUNT(*) AS customers FROM customers GROUP BY city ORDER BY 2 DESC",
          "columns": [{"name": "city", "label": "Thành phố", "type": "text"}, {"name": "customers", "label": "Số khách", "type": "number"}],
          "chart": {"type": "bar", "x": "city", "y": ["customers"]}, "suggestions": ["Chỉ khách mới"]})
    r = pipeline.ask("Khách theo thành phố", [])
    assert r["status"] == "ok" and r["row_count"] == 4
    assert r["columns"][0]["label"] == "Thành phố" and r["chart"]["type"] == "bar"
    assert r["summary"] == "Tóm tắt thử." and r["steps"] and r["attempts"] == [{"sql": r["sql"], "error": None}]


def test_retries_with_db_error_then_succeeds(fake):
    f = fake({"kind": "sql", "sql": "SELECT full_name FROM customers"}, {"kind": "sql", "sql": "SELECT name FROM customers ORDER BY name LIMIT 3"})
    r = pipeline.ask("Tên khách hàng", [])
    assert r["status"] == "ok" and len(r["attempts"]) == 2
    assert "full_name" in r["attempts"][0]["error"]
    assert "full_name" in f.calls[1][-1]["content"]  # the DB error was fed back to the model


def test_gives_up_after_retries_with_clear_error(fake):
    fake(*[{"kind": "sql", "sql": "SELECT nope FROM customers"}] * 3)
    r = pipeline.ask("?", [])
    assert r["status"] == "error" and len(r["attempts"]) == 3 and "3 lần thử" in r["message"]


def test_model_written_delete_is_blocked_not_run(fake, database):
    fake({"kind": "sql", "sql": "DELETE FROM orders WHERE status = 'cancelled'"})
    r = pipeline.ask("Delete all cancelled orders", [])
    assert r["status"] == "refused" and r["reason"] == "write_operation"
    assert orders_count(database) == 700


def test_refuse_and_clarify_pass_through(fake):
    fake({"kind": "refuse", "reason": "not_available", "message": "Không có dữ liệu nhân viên.", "suggestions": ["a"]})
    assert pipeline.ask("Show employee salaries", [])["reason"] == "not_available"
    fake({"kind": "clarify", "message": "Theo tiêu chí nào?", "options": ["Theo doanh thu", "Theo số lượng"]})
    r = pipeline.ask("What is the best product?", [])
    assert r["status"] == "clarify" and r["options"] == ["Theo doanh thu", "Theo số lượng"]


def test_empty_result_mentions_data_range(fake):
    fake({"kind": "sql", "sql": "SELECT id, order_date FROM orders WHERE order_date < '2025-01-01' ORDER BY 1"})
    r = pipeline.ask("List all orders from 2024", [])
    assert r["status"] == "empty" and "01/01/2025" in r["message"] and r["sql"]


def test_llm_failure_becomes_user_message(fake):
    fake(llm.LLMError("Mô hình AI phản hồi quá lâu.", "timeout"))
    r = pipeline.ask("Có bao nhiêu khách hàng?", [])
    assert r["status"] == "error" and r["message"] == "Mô hình AI phản hồi quá lâu."


def test_history_is_sent_as_previous_turns(fake):
    f = fake({"kind": "sql", "sql": "SELECT COUNT(*) AS n FROM orders WHERE order_date >= '2026-01-01'"})
    pipeline.ask("chỉ năm 2026", [{"question": "Có bao nhiêu đơn hàng?", "sql": "SELECT COUNT(*) FROM orders"}])
    msgs = f.calls[0]
    assert msgs[-3]["content"] == "Có bao nhiêu đơn hàng?" and "SELECT COUNT(*) FROM orders" in msgs[-2]["content"]


def test_history_includes_what_the_owner_saw(fake):
    f = fake({"kind": "sql", "sql": "SELECT name FROM customers WHERE id = 7"})
    pipeline.ask("khách đó ở đâu?", [
        {"question": "Sản phẩm nào tốt nhất?", "status": "clarify", "answer": "Theo tiêu chí nào?", "options": ["Theo doanh thu", "Theo số lượng"]},
        {"question": "Khách chi tiêu nhiều nhất", "sql": "SELECT id, name FROM customers LIMIT 1", "status": "ok",
         "answer": "Dang Phuc chi nhiều nhất.", "columns": ["id", "name"], "rows": [[7, "Dang Phuc"]] * 9},
    ])
    clarify, sql_turn = json.loads(f.calls[0][-4]["content"]), json.loads(f.calls[0][-2]["content"])
    assert clarify == {"kind": "clarify", "message": "Theo tiêu chí nào?", "options": ["Theo doanh thu", "Theo số lượng"]}
    assert sql_turn["result"]["first_rows"][0] == [7, "Dang Phuc"] and len(sql_turn["result"]["first_rows"]) == 5
    assert sql_turn["summary"] == "Dang Phuc chi nhiều nhất."


def test_api_never_returns_non_json_errors(fake):
    client = TestClient(app)
    assert client.post("/api/ask", content="not json", headers={"content-type": "application/json"}).json()["status"] == "error"
    assert client.post("/api/ask", json={"question": "   "}).json()["message"] == "Bạn chưa nhập câu hỏi."
    assert client.post("/api/ask", json={"question": "x" * 600}).json()["status"] == "error"
    assert client.get("/api/schema").json()["tables"][0]["name"] == "customers"


class SplitLLM:
    """Answers by the question being asked, so parallel parts get the right plan whatever the order."""

    def __init__(self, plans):
        self.plans = plans

    def __call__(self, messages, temperature=0):
        if messages[0]["content"].startswith("Bạn viết MỘT câu tóm tắt"):
            return {"summary": "Tóm tắt thử."}
        return self.plans[messages[-1]["content"]]


def test_split_question_answers_each_part_with_its_own_query(monkeypatch, database):
    monkeypatch.setattr(llm, "chat_json", SplitLLM({
        "Khách mua nhiều nhất và sản phẩm bán nhiều nhất": {"kind": "split", "parts": ["Khách mua nhiều nhất", "Sản phẩm bán nhiều nhất", "Lương nhân viên"]},
        "Khách mua nhiều nhất": {"kind": "sql", "sql": "SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY 1 ORDER BY 2 DESC LIMIT 1"},
        "Sản phẩm bán nhiều nhất": {"kind": "sql", "sql": "SELECT product_id, SUM(quantity) AS qty FROM order_items GROUP BY 1 ORDER BY 2 DESC LIMIT 1"},
        "Lương nhân viên": {"kind": "refuse", "reason": "not_available", "message": "Không có dữ liệu lương."},
    }))
    r = pipeline.ask("Khách mua nhiều nhất và sản phẩm bán nhiều nhất", [])
    assert r["status"] == "multi" and r["sql"] is None and r["message"]
    assert [p["question"] for p in r["parts"]] == ["Khách mua nhiều nhất", "Sản phẩm bán nhiều nhất", "Lương nhân viên"]
    assert [p["status"] for p in r["parts"]] == ["ok", "ok", "refused"]  # one part failing doesn't break the others
    assert all(p["summary"] for p in r["parts"][:2])


def test_part_that_tries_to_split_again_is_asked_for_sql(monkeypatch, database):
    answers = iter([{"kind": "split", "parts": ["a", "b"]}, {"kind": "sql", "sql": "SELECT COUNT(*) AS n FROM customers"}])
    monkeypatch.setattr(llm, "chat_json", lambda messages, temperature=0: next(answers) if "tóm tắt" not in messages[0]["content"] else {"summary": "x"})
    r = pipeline._ask("Một ý thôi", [], allow_split=False)
    assert r["status"] == "ok" and r["rows"] == [[100]]


def test_summary_gets_stats_over_all_rows_not_the_sample():
    from app.formatting import build_columns
    columns = build_columns([("order_id", "number"), ("status", "text"), ("total_vnd", "number")], None)
    rows = [[i, "paid" if i % 4 else "cancelled", 1000] for i in range(700)]
    stats = pipeline._stats(columns, rows)
    assert stats["status"] == {"count_by_value": {"cancelled": 175, "paid": 525}}
    assert stats["total_vnd"] == {"sum": 700000, "min": 1000, "max": 1000}
    assert "order_id" not in stats  # ids are labels: no sums, and too many distinct values to count


def test_no_sums_of_unit_prices():
    from app.formatting import build_columns
    columns = build_columns([("unit_price_vnd", "number"), ("quantity", "number")], None)
    stats = pipeline._stats(columns, [[5000, 2], [8000, 3]])
    assert "sum" not in stats["unit_price_vnd"] and stats["quantity"]["sum"] == 5


def test_info_question_returns_message_suggestions_and_real_tables(fake):
    fake({"kind": "info", "message": "Tôi trả lời câu hỏi về cửa hàng.", "suggestions": ["Doanh thu theo tháng"]})
    r = pipeline.ask("Bạn làm được gì?", [])
    assert r["status"] == "info" and r["sql"] is None and r["suggestions"] == ["Doanh thu theo tháng"]
    assert [t["name"] for t in r["tables"]] == ["customers", "products", "orders", "order_items"]


def test_fixed_messages_follow_the_answer_language(fake):
    # Before the model runs, the UI language is used.
    assert pipeline.ask("", [], "en")["message"] == "Please type a question."
    # After it runs, the question's language (as the model reports it) wins over the UI language.
    fake({"kind": "sql", "lang": "en", "sql": "SELECT id FROM orders WHERE order_date < '2024-01-01'"})
    r = pipeline.ask("Orders in 2023", [], "vi")
    assert r["status"] == "empty" and r["message"].startswith("No data matches this question. Order data covers 01/01/2025")
    fake({"kind": "info", "lang": "en", "message": "I answer questions about your shop."})
    r = pipeline.ask("What can you do?", [], "vi")
    assert r["tables"][0]["description"] == "Customers"
    fake(llm.LLMError(detail="boom", key="llm_timeout"))
    assert pipeline.ask("Có bao nhiêu khách?", [], "en")["message"].startswith("The AI model took too long")


def test_system_prompt_names_the_ui_language_as_fallback(fake):
    f = fake({"kind": "clarify", "lang": "en", "message": "Which year?"})
    pipeline.ask("2026", [], "en")
    assert "tiếng Anh (en)" in f.calls[0][0]["content"]


def test_detect_lang():
    from app.i18n import detect_lang

    assert detect_lang("Orders in the year 2024") == "en"
    assert detect_lang("What can you do?") == "en"
    assert detect_lang("Doanh thu theo thành phố") == "vi"
    assert detect_lang("Top 3 khách hàng") == "vi"
    assert detect_lang("2026") is None
    assert detect_lang("top 10") is None
