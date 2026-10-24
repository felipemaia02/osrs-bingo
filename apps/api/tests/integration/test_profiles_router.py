from collections.abc import Iterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.profiles.router import get_profile_service
from app.modules.profiles.schemas import BalanceTotals, ProfileResponse

ORIGIN = {"Origin": "http://localhost:5173"}
EMPTY = ProfileResponse(
    discord_id="1",
    username="Hal",
    timezone=None,
    activity=None,
    accounts=[],
    totals=BalanceTotals(boss_kc=0, ehb=0, counted=0, total=0, not_found=[]),
)


@pytest.fixture
def profiles() -> Iterator[AsyncMock]:
    auth, service = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="Hal", is_admin=False
    )
    for method in ("get", "set_preferences", "add_account", "remove_account", "make_main"):
        getattr(service, method).return_value = EMPTY

    async def auth_override() -> AsyncMock:
        return auth

    async def service_override() -> AsyncMock:
        return service

    app.dependency_overrides[get_auth_service] = auth_override
    app.dependency_overrides[get_profile_service] = service_override
    try:
        yield service
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_profile_service, None)


async def test_reads_and_changes_the_own_profile(client: AsyncClient, profiles: AsyncMock) -> None:
    assert (await client.get("/profile/me")).json()["totals"]["total"] == 0

    added = await client.post("/profile/me/accounts", json={"rsn": "Holy Hal"}, headers=ORIGIN)
    assert added.status_code == 201
    assert profiles.add_account.await_args.args[1].rsn == "Holy Hal"

    prefs = await client.patch(
        "/profile/me/preferences",
        json={"timezone": "Europe/London", "activity": "under_1h"},
        headers=ORIGIN,
    )
    assert prefs.status_code == 200


async def test_rejects_invalid_input(client: AsyncClient, profiles: AsyncMock) -> None:
    bad_rsn = await client.post("/profile/me/accounts", json={"rsn": "no!"}, headers=ORIGIN)
    bad_timezone = await client.patch(
        "/profile/me/preferences", json={"timezone": "../etc/passwd"}, headers=ORIGIN
    )

    assert bad_rsn.status_code == 422 and bad_timezone.status_code == 422
    profiles.add_account.assert_not_awaited()


async def test_requires_a_signed_in_user(client: AsyncClient, profiles: AsyncMock) -> None:
    auth = AsyncMock()
    auth.current_user.side_effect = AppException(401, "Not signed in")

    async def signed_out() -> AsyncMock:
        return auth

    app.dependency_overrides[get_auth_service] = signed_out

    assert (await client.get("/profile/me")).status_code == 401
    profiles.get.assert_not_awaited()
