from collections.abc import Iterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.main import app
from app.modules.administration.router import get_administration_service
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.players.router import get_player_service
from app.modules.players.schemas import PlayerResponse, RegistrationStatus
from app.modules.teams.router import get_team_service
from app.modules.teams.schemas import DraftPreviewResponse, TeamBalanceResponse

EVENT_ID, PLAYER_ID, ADMIN_ID = (str(ObjectId()) for _ in range(3))
ORIGIN = {"Origin": "http://localhost:5173"}


def _provider(value: AsyncMock):  # type: ignore[no-untyped-def]
    async def provide() -> AsyncMock:
        return value

    return provide


@pytest.fixture
def services() -> Iterator[tuple[AsyncMock, AsyncMock, AsyncMock, AsyncMock]]:
    auth, players, teams, administration = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id=ADMIN_ID, discord_id="1", username="felps_", is_admin=True
    )
    now = datetime.now(UTC)
    players.update_participation.return_value = PlayerResponse(
        id=PLAYER_ID,
        display_name="Iris",
        status=RegistrationStatus.APPROVED,
        event_id=EVENT_ID,
        team_id=None,
        created_at=now,
        updated_at=now,
    )
    teams.balance.return_value = TeamBalanceResponse(average_ehb=0, teams=[])
    teams.draft_preview.return_value = DraftPreviewResponse(captains=[], players=[])
    administration.administrators.return_value = []
    overrides = {
        get_auth_service: auth,
        get_player_service: players,
        get_team_service: teams,
        get_administration_service: administration,
    }
    for dependency, value in overrides.items():
        app.dependency_overrides[dependency] = _provider(value)
    try:
        yield auth, players, teams, administration
    finally:
        for dependency in overrides:
            app.dependency_overrides.pop(dependency, None)


async def test_admin_updates_participation_and_reads_balance(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock, AsyncMock, AsyncMock]
) -> None:
    _, players, teams, administration = services
    payload = {"role": "captain", "buy_in_status": "paid", "buy_in_admin_id": ADMIN_ID}

    updated = await client.patch(
        f"/events/{EVENT_ID}/players/{PLAYER_ID}/participation", json=payload, headers=ORIGIN
    )
    balance = await client.get(f"/events/{EVENT_ID}/teams/balance")
    admins = await client.get("/admin/administrators")
    preview = await client.get(f"/events/{EVENT_ID}/teams/draft-preview")

    assert preview.status_code == 200 and preview.json() == {"captains": [], "players": []}
    assert updated.status_code == 200
    assert players.update_participation.await_args.args[2].role == "captain"
    assert balance.status_code == 200 and balance.json() == {"average_ehb": 0, "teams": []}
    assert admins.status_code == 200
    teams.balance.assert_awaited_once_with(EVENT_ID)
    administration.administrators.assert_awaited_once()


async def test_participation_validates_the_buy_in(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock, AsyncMock, AsyncMock]
) -> None:
    response = await client.patch(
        f"/events/{EVENT_ID}/players/{PLAYER_ID}/participation",
        json={"role": None, "buy_in_status": "paid"},
        headers=ORIGIN,
    )

    assert response.status_code == 422
    services[1].update_participation.assert_not_awaited()


async def test_players_cannot_see_balance_or_change_participation(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock, AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.return_value.is_admin = False

    responses = [
        await client.patch(
            f"/events/{EVENT_ID}/players/{PLAYER_ID}/participation",
            json={"role": None, "buy_in_status": "pending"},
            headers=ORIGIN,
        ),
        await client.get(f"/events/{EVENT_ID}/teams/balance"),
        await client.get("/admin/administrators"),
        await client.get(f"/events/{EVENT_ID}/teams/draft-preview"),
    ]

    assert [response.status_code for response in responses] == [403, 403, 403, 403]
    services[1].update_participation.assert_not_awaited()
