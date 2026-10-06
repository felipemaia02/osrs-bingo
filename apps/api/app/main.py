import logging
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import OAuthAccessLogFilter, get_logger, log_event
from app.database.indexes import IndexManager
from app.database.mongodb import DatabaseClient
from app.modules.administration.repository import AdministrationRepository
from app.modules.administration.router import router as administration_router
from app.modules.auth.router import router as auth_router
from app.modules.boards.router import admin_router as admin_boards_router
from app.modules.boards.router import public_router as public_boards_router
from app.modules.events.router import router as events_router
from app.modules.players.router import router as players_router
from app.modules.security.middleware import RequestSafetyMiddleware
from app.modules.teams.router import router as teams_router
from app.modules.tiles.router import router as tiles_router
from app.modules.tiles.router import wiki_router

logger = get_logger(__name__)
logging.getLogger("uvicorn.access").addFilter(OAuthAccessLogFilter())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log_event(logger, 20, "application_starting")
    db_client = DatabaseClient()
    try:
        await db_client.connect(settings)
        app.state.db_client = db_client
        await IndexManager().ensure_all(db_client.database)
        await AdministrationRepository(db_client.database).initialize(settings.admin_discord_ids)
        log_event(logger, 20, "application_ready")
        yield
    finally:
        log_event(logger, 20, "application_stopping")
        await db_client.disconnect()


async def request_logging(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log_event(
            logger,
            40,
            "request_failed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        raise
    duration_ms = round((perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    level = 40 if response.status_code >= 500 else 30 if response.status_code >= 400 else 20
    log_event(
        logger,
        level,
        "request_completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response


app = FastAPI(
    title="OSRS Bingo API",
    version="0.1.0",
    description="Platform for managing OSRS Bingo events",
    lifespan=lifespan,
)

app.middleware("http")(request_logging)

app.add_middleware(RequestSafetyMiddleware, max_body_bytes=settings.max_request_body_bytes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
app.include_router(events_router)
app.include_router(auth_router)
app.include_router(administration_router)
app.include_router(teams_router)
app.include_router(players_router)
app.include_router(tiles_router)
app.include_router(wiki_router)
app.include_router(public_boards_router)
app.include_router(admin_boards_router)


@app.get("/health", tags=["infra"])
async def health() -> dict[str, str]:
    """Basic liveness probe."""
    log_event(logger, 20, "health_check_requested")
    return {"status": "ok"}
