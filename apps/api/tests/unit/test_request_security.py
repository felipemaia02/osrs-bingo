from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient
from pymongo.errors import PyMongoError

from app.core.exceptions import AppException
from app.modules.security.middleware import RequestSafetyMiddleware
from app.modules.security.repository import RateLimitRepository
from app.modules.security.service import RequestLimiter


async def test_shared_rate_counter_rejects_excess_and_hashes_subject() -> None:
    repository = AsyncMock(spec=RateLimitRepository)
    repository.increment.side_effect = [1, 2, 3]
    limiter = RequestLimiter(repository)
    await limiter.check("mutation", "private-user-id", 2)
    await limiter.check("mutation", "private-user-id", 2)
    with pytest.raises(AppException) as result:
        await limiter.check("mutation", "private-user-id", 2)
    assert result.value.status_code == 429
    assert result.value.headers and int(result.value.headers["Retry-After"]) > 0
    assert "private-user-id" not in repository.increment.call_args.args[0]


async def test_rate_storage_failure_fails_closed() -> None:
    repository = AsyncMock(spec=RateLimitRepository)
    repository.increment.side_effect = PyMongoError("unavailable")
    with pytest.raises(AppException) as result:
        await RequestLimiter(repository).check("mutation", "user", 2)
    assert result.value.status_code == 503


async def test_oversized_stream_is_rejected_before_application() -> None:
    app = AsyncMock()
    middleware = RequestSafetyMiddleware(app, max_body_bytes=4)
    receive = AsyncMock(
        side_effect=[
            {"type": "http.request", "body": b"123", "more_body": True},
            {"type": "http.request", "body": b"45", "more_body": False},
        ]
    )
    send = AsyncMock()
    await middleware(
        {"type": "http", "method": "POST", "path": "/events", "headers": []}, receive, send
    )
    app.assert_not_awaited()
    assert send.call_args_list[0].args[0]["status"] == 413


async def test_large_body_and_private_headers(client: AsyncClient) -> None:
    response = await client.post("/events", content=b"x" * 65537)
    assert response.status_code == 413
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "no-referrer"


async def test_auth_rate_rejection_ignores_forged_forwarded_ip(
    client: AsyncClient, request_limiter_override: AsyncMock
) -> None:
    request_limiter_override.check.side_effect = AppException(
        429, "Too many requests", headers={"Retry-After": "12"}
    )
    response = await client.get("/auth/discord/login", headers={"X-Forwarded-For": "forged"})
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "12"
    assert request_limiter_override.check.call_args.args[1] == "127.0.0.1"
