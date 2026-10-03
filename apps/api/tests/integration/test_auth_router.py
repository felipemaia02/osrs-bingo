from collections.abc import Iterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser


@pytest.fixture
def auth() -> Iterator[AsyncMock]:
    service = AsyncMock()
    service.start_login.return_value = ("https://discord.com/oauth2/authorize?state=test", "test")
    service.complete_login.return_value = "opaque-token"
    service.current_user.return_value = CurrentUser(
        id="user", discord_id="123", username="Crab", is_admin=False
    )

    async def override():
        return service

    app.dependency_overrides[get_auth_service] = override
    try:
        yield service
    finally:
        app.dependency_overrides.pop(get_auth_service, None)


async def test_login_callback_and_logout_cookie_contract(
    client: AsyncClient, auth: AsyncMock
) -> None:
    response = await client.get("/auth/discord/login")
    assert response.status_code == 303
    assert response.headers["location"].startswith("https://discord.com/oauth2/authorize")
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/auth" in cookie
    response = await client.get("/auth/discord/callback?code=code&state=test")
    assert response.status_code == 303
    auth.complete_login.assert_awaited_once_with("code", "test", "test")
    cookies = response.headers.get_list("set-cookie")
    assert any("osrs_session=opaque-token" in cookie and "HttpOnly" in cookie for cookie in cookies)
    assert response.headers["location"] == "http://localhost:5173/login"
    assert response.headers["Cache-Control"] == "no-store"
    response = await client.get("/auth/me")
    assert response.json()["is_admin"] is False
    auth.current_user.assert_awaited_once_with("opaque-token")
    response = await client.post("/auth/logout", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 204
    auth.logout.assert_awaited_with("opaque-token")
    assert "Max-Age=0" in response.headers["set-cookie"]


async def test_bad_callback_does_not_set_session(client: AsyncClient, auth: AsyncMock) -> None:
    auth.complete_login.side_effect = AppException(400, "Invalid login state")
    response = await client.get("/auth/discord/callback?code=code&state=wrong")
    assert response.status_code == 303
    assert response.headers["location"].endswith("/login?login=failed")
    assert not any("osrs_session=" in cookie for cookie in response.headers.get_list("set-cookie"))


async def test_production_cookie_is_secure(
    client: AsyncClient, auth: AsyncMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    response = await client.get("/auth/discord/login")
    assert "Secure" in response.headers["set-cookie"]


async def test_logout_rejects_untrusted_origin(client: AsyncClient, auth: AsyncMock) -> None:
    response = await client.post("/auth/logout", headers={"Origin": "https://other.example"})
    assert response.status_code == 403
    auth.logout.assert_not_awaited()


async def test_unconfigured_login_returns_to_login_page(
    client: AsyncClient, auth: AsyncMock
) -> None:
    auth.start_login.side_effect = AppException(503, "Discord login is not configured")
    response = await client.get("/auth/discord/login")
    assert response.status_code == 303
    assert response.headers["location"] == "http://localhost:5173/login?login=unavailable"
    assert response.headers["Cache-Control"] == "no-store"
    assert "set-cookie" not in response.headers
