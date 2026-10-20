from app.formatting import build_columns, pick_chart


def cols(*spec):
    return build_columns(list(spec), None)


ROWS3 = [["a", "x", 1], ["b", "y", 2], ["c", "z", 3]]


def test_bar_is_labelled_by_name_not_by_category():
    c = cols(("category", "text"), ("product_name", "text"), ("total_quantity", "number"))
    # Both the heuristic and an LLM hint pointing at the category end up on the name.
    assert pick_chart(c, ROWS3, None)["x"] == "product_name"
    assert pick_chart(c, ROWS3, {"type": "bar", "x": "category", "y": ["total_quantity"]})["x"] == "product_name"


def test_fewer_than_three_rows_shows_the_table():
    c = cols(("entity", "text"), ("name", "text"), ("total_quantity", "number"))
    assert pick_chart(c, [["Khách hàng", "Dang Phuc", 73], ["Sản phẩm", "Laundry powder 3kg", 115]], None) is None


def test_ids_are_not_used_as_bar_labels():
    c = cols(("customer_id", "number"), ("name", "text"), ("total_spent_vnd", "number"))
    assert pick_chart(c, ROWS3, None) == {"type": "bar", "x": "name", "y": ["total_spent_vnd"]}


def test_time_series_is_a_line_and_a_line_hint_needs_a_date_axis():
    c = cols(("month", "date"), ("revenue_vnd", "number"))
    rows = [["2025-01-01", 1], ["2025-02-01", 2], ["2025-03-01", 3]]
    assert pick_chart(c, rows, None) == {"type": "line", "x": "month", "y": ["revenue_vnd"]}
    c2 = cols(("city", "text"), ("customers", "number"))
    assert pick_chart(c2, ROWS3, {"type": "line", "x": "city", "y": ["customers"]})["type"] == "bar"


def test_category_bar_without_a_name_column_keeps_the_category():
    c = cols(("category", "text"), ("revenue_vnd", "number"))
    assert pick_chart(c, ROWS3, {"type": "bar", "x": "category", "y": ["revenue_vnd"]})["x"] == "category"
