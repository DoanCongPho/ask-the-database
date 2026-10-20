"""Thin client for any OpenAI-compatible chat API (OpenAI, Gemini, Groq, OpenRouter, Ollama...)."""

import json
import re

import openai

from .config import settings


class LLMError(Exception):
    """Carries a Vietnamese message that is safe to show to the shop owner."""

    def __init__(self, user_message: str, detail: str = ""):
        super().__init__(detail or user_message)
        self.user_message = user_message
        self.detail = detail


_client: openai.OpenAI | None = None


def _get_client() -> openai.OpenAI:
    global _client
    if not settings.llm_api_key:
        raise LLMError("Chưa cấu hình mô hình AI: thiếu LLM_API_KEY trong file backend/.env.")
    if _client is None:
        _client = openai.OpenAI(
            api_key=settings.llm_api_key, base_url=settings.llm_base_url, timeout=settings.llm_timeout_s, max_retries=1
        )
    return _client


def parse_json(text: str) -> dict:
    """Parse a JSON object from model output, tolerating ```json fences or text around it."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    if not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object in model output")
        text = text[start : end + 1]
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("model output is not a JSON object")
    return data


def chat_json(messages: list[dict], temperature: float = 0) -> dict:
    """Send messages and return the model's JSON answer, or raise LLMError."""
    client = _get_client()
    kwargs = dict(model=settings.llm_model, messages=messages, temperature=temperature,
                  response_format={"type": "json_object"})
    try:
        while True:
            try:
                resp = client.chat.completions.create(**kwargs)
                break
            except openai.BadRequestError as e:
                # Reasoning models (gpt-5, o-series) reject a custom temperature; some providers lack
                # JSON mode (the prompt still asks for JSON). Drop the unsupported option and retry.
                if "temperature" in kwargs and "temperature" in str(e):
                    kwargs.pop("temperature")
                elif "response_format" in kwargs:
                    kwargs.pop("response_format")
                else:
                    raise
    except openai.APITimeoutError as e:
        raise LLMError("Mô hình AI phản hồi quá lâu. Bạn thử lại sau ít phút nhé.", str(e)) from e
    except openai.AuthenticationError as e:
        raise LLMError("Khóa API của mô hình AI không hợp lệ (kiểm tra LLM_API_KEY).", str(e)) from e
    except openai.RateLimitError as e:
        raise LLMError("Mô hình AI đang quá tải hoặc hết hạn mức. Bạn thử lại sau ít phút nhé.", str(e)) from e
    except openai.APIError as e:
        raise LLMError("Không kết nối được mô hình AI. Bạn thử lại sau nhé.", str(e)) from e

    content = (resp.choices[0].message.content or "") if resp.choices else ""
    try:
        return parse_json(content)
    except ValueError as e:
        raise LLMError("Mô hình AI trả lời sai định dạng. Bạn thử hỏi lại nhé.", f"{e}: {content[:500]}") from e
