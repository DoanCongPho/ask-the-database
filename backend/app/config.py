"""Settings from environment variables (or backend/.env)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str | None = os.getenv("LLM_BASE_URL") or None  # None = OpenAI
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4.1-mini")
    llm_timeout_s: int = _int("LLM_TIMEOUT_S", 45)
    database_url: str = os.getenv("DATABASE_URL", "postgresql://shop_reader:shop_reader@localhost:5432/shop")
    max_rows: int = _int("MAX_ROWS", 1000)
    max_retries: int = _int("MAX_RETRIES", 2)
    statement_timeout_ms: int = _int("STATEMENT_TIMEOUT_MS", 5000)
    max_question_chars: int = 500
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",")
    )
    schema_path: Path = Path(os.getenv("SCHEMA_PATH", REPO_DIR / "schema.sql"))


settings = Settings()
