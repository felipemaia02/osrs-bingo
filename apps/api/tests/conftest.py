from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.mongodb import DatabaseClient
from app.main import app
from app.modules.security.dependencies import get_request_limiter
from app.modules.security.service import RequestLimiter


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    with (
        patch.object(DatabaseClient, "connect", new_callable=AsyncMock),
        patch.object(DatabaseClient, "disconnect", new_callable=AsyncMock),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac


@pytest.fixture(autouse=True)
def request_limiter_override():
    limiter = AsyncMock(spec=RequestLimiter)

    async def override():
        return limiter

    app.dependency_overrides[get_request_limiter] = override
    yield limiter
    app.dependency_overrides.pop(get_request_limiter, None)
