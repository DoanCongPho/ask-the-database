"""Fixed messages the app writes itself (not the LLM), in Vietnamese and English.

Text the LLM writes (summary, steps, options, suggestions) follows the language of the question.
These fixed messages follow that same answer language once it is known, else the UI language.
"""

LANGS = ("vi", "en")

MESSAGES: dict[str, dict[str, str]] = {
    "db_down": {
        "vi": "Không kết nối được cơ sở dữ liệu. Bạn kiểm tra lại máy chủ dữ liệu rồi thử lại nhé.",
        "en": "Can't connect to the database. Please check the database server and try again.",
    },
    "empty_question": {"vi": "Bạn chưa nhập câu hỏi.", "en": "Please type a question."},
    "too_long": {
        "vi": "Câu hỏi dài quá ({n} ký tự). Bạn rút gọn dưới {max} ký tự nhé.",
        "en": "The question is too long ({n} characters). Please keep it under {max}.",
    },
    "clarify_default": {"vi": "Bạn nói rõ hơn giúp tôi nhé?", "en": "Could you be more specific?"},
    "info_default": {
        "vi": "Tôi trả lời câu hỏi về khách hàng, sản phẩm, đơn hàng và doanh thu của cửa hàng.",
        "en": "I answer questions about the shop's customers, products, orders and revenue.",
    },
    "blocked_write": {
        "vi": "Câu hỏi này dẫn tới thao tác thay đổi dữ liệu nên tôi đã chặn lại. Ứng dụng chỉ xem dữ liệu.",
        "en": "This would change data, so I blocked it. The app can only read data.",
    },
    "db_blocked_write": {
        "vi": "Cơ sở dữ liệu đã chặn thao tác này vì ứng dụng chỉ được phép xem dữ liệu.",
        "en": "The database blocked this because the app is only allowed to read data.",
    },
    "timeout": {
        "vi": "Truy vấn chạy quá lâu nên tôi đã dừng lại. Bạn thử hỏi hẹp hơn (ví dụ một năm, một thành phố) nhé.",
        "en": "The query took too long, so I stopped it. Try a narrower question (for example one year or one city).",
    },
    "gave_up": {
        "vi": "Tôi chưa viết được truy vấn đúng cho câu này sau {n} lần thử. Bạn thử hỏi cụ thể hơn nhé.",
        "en": "I couldn't write a working query for this after {n} attempts. Try asking more specifically.",
    },
    "part_failed": {
        "vi": "Tôi chưa trả lời được phần này. Bạn thử hỏi riêng nhé.",
        "en": "I couldn't answer this part. Try asking it on its own.",
    },
    "split_default": {
        "vi": "Câu hỏi có {n} ý nên tôi trả lời từng ý riêng.",
        "en": "Your question has {n} parts, so I answered each one separately.",
    },
    "no_rows": {"vi": "Không có dữ liệu phù hợp với câu hỏi này.", "en": "No data matches this question."},
    "date_range": {"vi": "Dữ liệu đơn hàng có từ {first} đến {last}.", "en": "Order data covers {first} to {last}."},
    # LLM failures
    "llm_no_key": {
        "vi": "Chưa cấu hình mô hình AI: thiếu LLM_API_KEY trong file backend/.env.",
        "en": "The AI model isn't configured: LLM_API_KEY is missing in backend/.env.",
    },
    "llm_timeout": {
        "vi": "Mô hình AI phản hồi quá lâu. Bạn thử lại sau ít phút nhé.",
        "en": "The AI model took too long to respond. Please try again in a few minutes.",
    },
    "llm_auth": {
        "vi": "Khóa API của mô hình AI không hợp lệ (kiểm tra LLM_API_KEY).",
        "en": "The AI model's API key is invalid (check LLM_API_KEY).",
    },
    "llm_rate_limit": {
        "vi": "Mô hình AI đang quá tải hoặc hết hạn mức. Bạn thử lại sau ít phút nhé.",
        "en": "The AI model is overloaded or out of quota. Please try again in a few minutes.",
    },
    "llm_unreachable": {
        "vi": "Không kết nối được mô hình AI. Bạn thử lại sau nhé.",
        "en": "Can't reach the AI model. Please try again later.",
    },
    "llm_bad_format": {
        "vi": "Mô hình AI trả lời sai định dạng. Bạn thử hỏi lại nhé.",
        "en": "The AI model answered in the wrong format. Please ask again.",
    },
}


def norm_lang(lang: object, default: str = "vi") -> str:
    return lang if lang in LANGS else default


def t(key: str, lang: str, **kw) -> str:
    return MESSAGES[key][norm_lang(lang)].format(**kw)
