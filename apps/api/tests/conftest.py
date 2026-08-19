from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.mongodb import DatabaseClient
from app.main import app


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
