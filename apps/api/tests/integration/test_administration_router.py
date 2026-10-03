from collections.abc import Iterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.exceptions import AppException
from app.main import app
from app.modules.administration.router import get_administration_service
from app.modules.administration.schemas import DirectoryUser, UserDirectory
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser


@pytest.fixture
def services() -> Iterator[tuple[AsyncMock, AsyncMock]]:
    auth, administration = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="actor", discord_id="111", username="Admin", is_admin=True
    )
    user = DirectoryUser(id="target", discord_id="222", username="Player", is_admin=False)
    administration.directory.return_value = UserDirectory(items=[user], total=1, offset=0, limit=25)
    administration.change_role.return_value = user.model_copy(update={"is_admin": True})

    async def auth_override():
        return auth

    async def administration_override():
        return administration

    app.dependency_overrides[get_auth_service] = auth_override
    app.dependency_overrides[get_administration_service] = administration_override
    try:
        yield auth, administration
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_administration_service, None)


async def test_admin_directory_and_role_contract(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    response = await client.get("/admin/users?search=Crab&limit=10")
    assert response.status_code == 200
    services[1].directory.assert_awaited_once_with("Crab", 0, 10)
    response = await client.patch(
        "/admin/users/target/role",
        json={"is_admin": True},
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.json()["is_admin"] is True


async def test_non_admin_cannot_read_or_select_administrators(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.return_value.is_admin = False
    assert (await client.get("/admin/users")).status_code == 403
    assert (
        await client.patch(
            "/admin/users/target/role",
            json={"is_admin": True},
            headers={"Origin": "http://localhost:5173"},
        )
    ).status_code == 403
    services[1].directory.assert_not_awaited()
    services[1].change_role.assert_not_awaited()


async def test_directory_bounds_and_role_fields_are_validated(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    assert (await client.get("/admin/users?limit=1000")).status_code == 422
    assert (
        await client.patch(
            "/admin/users/target/role",
            json={"is_admin": "true"},
            headers={"Origin": "http://localhost:5173"},
        )
    ).status_code == 422
    services[1].change_role.assert_not_awaited()


async def test_anonymous_requests_never_read_or_change_administrator_data(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.side_effect = AppException(401, "Authentication required")
    assert (await client.get("/admin/users")).status_code == 401
    assert (
        await client.patch(
            "/admin/users/target/role",
            json={"is_admin": True},
            headers={"Origin": "http://localhost:5173"},
        )
    ).status_code == 401
    services[1].directory.assert_not_awaited()
    services[1].change_role.assert_not_awaited()
