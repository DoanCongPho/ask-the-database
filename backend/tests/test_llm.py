import httpx
import openai
import pytest

from app import llm


class _Completions:
    """Fake chat.completions that rejects the options listed in `unsupported`."""

    def __init__(self, unsupported):
        self.unsupported = unsupported
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(set(kwargs))
        for opt in self.unsupported:
            if opt in kwargs:
                req = httpx.Request("POST", "https://x/v1/chat/completions")
                raise openai.BadRequestError(f"Unsupported parameter: '{opt}'", response=httpx.Response(400, request=req), body=None)
        msg = type("M", (), {"content": '{"kind": "clarify"}'})
        return type("R", (), {"choices": [type("C", (), {"message": msg})]})


@pytest.mark.parametrize("unsupported", [[], ["temperature"], ["response_format"], ["temperature", "response_format"]])
def test_chat_json_drops_unsupported_options(monkeypatch, unsupported):
    fake = _Completions(unsupported)
    client = type("Client", (), {"chat": type("Chat", (), {"completions": fake})})
    monkeypatch.setattr(llm, "_get_client", lambda: client)
    assert llm.chat_json([{"role": "user", "content": "hi"}]) == {"kind": "clarify"}
    assert not (fake.calls[-1] & set(unsupported))
