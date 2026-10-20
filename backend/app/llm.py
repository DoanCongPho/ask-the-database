"""Thin client for any OpenAI-compatible chat API (OpenAI, Gemini, Groq, OpenRouter, Ollama...)."""

import json
import re

import openai

from .config import settings
from .i18n import t


class LLMError(Exception):
    """Carries a message that is safe to show to the shop owner (`key` from i18n.MESSAGES)."""

    def __init__(self, user_message: str = "", detail: str = "", key: str | None = None):
        super().__init__(detail or user_message or key)
        self.user_message = user_message
        self.detail = detail
        self.key = key

    def text(self, lang: str) -> str:
        return t(self.key, lang) if self.key else self.user_message


_client: openai.OpenAI | None = None


def _get_client() -> openai.OpenAI:
    global _client
    if not settings.llm_api_key:
        raise LLMError(key="llm_no_key")
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
        raise LLMError(detail=str(e), key="llm_timeout") from e
    except openai.AuthenticationError as e:
        raise LLMError(detail=str(e), key="llm_auth") from e
    except openai.RateLimitError as e:
        raise LLMError(detail=str(e), key="llm_rate_limit") from e
    except openai.APIError as e:
        raise LLMError(detail=str(e), key="llm_unreachable") from e

    content = (resp.choices[0].message.content or "") if resp.choices else ""
    try:
        return parse_json(content)
    except ValueError as e:
        raise LLMError(detail=f"{e}: {content[:500]}", key="llm_bad_format") from e
