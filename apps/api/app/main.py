from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.database.mongodb import DatabaseClient


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    db_client = DatabaseClient()
    await db_client.connect(settings)
    app.state.db_client = db_client
    yield
    await db_client.disconnect()


app = FastAPI(
    title="OSRS Bingo API",
    version="0.1.0",
    description="Platform for managing OSRS Bingo events",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]


@app.get("/health", tags=["infra"])
async def health() -> dict[str, str]:
    """Basic liveness probe."""
    return {"status": "ok"}
