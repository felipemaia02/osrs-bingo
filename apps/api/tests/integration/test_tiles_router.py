from unittest.mock import AsyncMock

from fastapi import status
from httpx import AsyncClient

from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.tiles.router import get_card_service


async def test_card_catalog_requires_authentication(client: AsyncClient) -> None:
    service = AsyncMock()
    auth = AsyncMock()
    auth.current_user.side_effect = AppException(401, "Authentication required")

    async def override_service() -> AsyncMock:
        return service

    async def override_auth() -> AsyncMock:
        return auth

    app.dependency_overrides[get_card_service] = override_service
    app.dependency_overrides[get_auth_service] = override_auth
    try:
        response = await client.get("/admin/cards")
    finally:
        app.dependency_overrides.pop(get_card_service, None)
        app.dependency_overrides.pop(get_auth_service, None)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    service.list.assert_not_awaited()
