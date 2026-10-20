"""HTTP API. Every endpoint answers with JSON the frontend can render, even on failure."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import db, pipeline
from .schema_info import SCHEMA_INFO
from .config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.pool.open(wait=False)  # start even if the DB is down; requests then get a clear error
    yield
    db.pool.close()


app = FastAPI(title="Hỏi Cửa Hàng API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])


class HistoryTurn(BaseModel):
    """One earlier turn of the same conversation. Besides the SQL, the frontend sends what the owner
    saw (summary/message, clarify options, first rows) so follow-ups like "khách đó" can be resolved."""

    question: str = ""
    sql: str | None = None
    status: str | None = None
    answer: str | None = None
    options: list[str] = Field(default_factory=list)
    columns: list[str] = Field(default_factory=list)
    rows: list[list] = Field(default_factory=list)


class AskRequest(BaseModel):
    question: str = ""
    history: list[HistoryTurn] = Field(default_factory=list)


def _error_body(message: str, detail: str | None = None) -> dict:
    return {"status": "error", "question": "", "sql": None, "message": message, "columns": [], "rows": [],
            "row_count": 0, "truncated": False, "error_detail": detail}


@app.exception_handler(RequestValidationError)
async def bad_request(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content=_error_body("Yêu cầu gửi lên không hợp lệ.", str(exc.errors())[:500]))


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception):
    log.exception("unhandled error")
    return JSONResponse(status_code=500, content=_error_body("Đã có lỗi không mong muốn ở máy chủ. Bạn thử lại nhé.", type(exc).__name__))


@app.post("/api/ask")
def ask(req: AskRequest) -> dict:
    history = [t.model_dump() for t in req.history]
    return pipeline.ask(req.question, history)



@app.get("/api/schema")
def schema() -> dict:
    return SCHEMA_INFO


@app.get("/api/health")
def health() -> dict:
    db_ok = db.ping()
    return {"ok": db_ok and bool(settings.llm_api_key), "db": db_ok, "llm_model": settings.llm_model}
