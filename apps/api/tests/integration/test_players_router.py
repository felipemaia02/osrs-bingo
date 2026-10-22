from collections.abc import Iterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.events.schemas import EventStatus
from app.modules.players.router import get_player_service
from app.modules.players.service import PlayerService

EVENT_ID = str(ObjectId())
PLAYER_ID = str(ObjectId())
TEAM_ID = str(ObjectId())
USER_ID = str(ObjectId())


@pytest.fixture
def repositories() -> Iterator[tuple[AsyncMock, AsyncMock, AsyncMock]]:
    players, teams, events = AsyncMock(), AsyncMock(), AsyncMock()
    events.get.return_value = {"status": EventStatus.DRAFT}
    now = datetime.now(UTC)
    registration = {
        "_id": ObjectId(PLAYER_ID),
        "event_id": ObjectId(EVENT_ID),
        "team_id": None,
        "display_name": "Thunder Crab",
        "normalized_display_name": "thunder crab",
        "created_at": now,
        "updated_at": now,
    }
    registration["status"] = "pending"
    players.get_for_user.return_value = None
    players.create.return_value = registration
    players.page.return_value = ([registration], 1)
    players.counts.return_value = {"pending": 1, "unassigned": 0, "assigned": 0}
    players.update.return_value = {
        **registration,
        "status": "approved",
        "team_id": ObjectId(TEAM_ID),
    }
    players.approve.return_value = {**registration, "status": "approved"}
    players.approve_all.return_value = 2
    players.remove.return_value = {**registration, "status": "removed"}
    service = PlayerService(players, teams, events)

    async def override_service() -> PlayerService:
        return service

    auth = AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id=USER_ID, discord_id="123", username="Admin", is_admin=True
    )

    async def override_auth():
        return auth

    app.dependency_overrides[get_auth_service] = override_auth
    app.dependency_overrides[get_player_service] = override_service
    try:
        yield players, teams, events
    finally:
        app.dependency_overrides.pop(get_player_service, None)
        app.dependency_overrides.pop(get_auth_service, None)


async def test_register_list_then_assign_existing_player(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    players, teams, _ = repositories
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(
        f"/events/{EVENT_ID}/players", json={"display_name": "Thunder Crab"}
    )
    assert response.status_code == 201
    assert response.json()["team_id"] is None
    teams.get.assert_not_awaited()

    response = await client.get(f"/events/{EVENT_ID}/players")
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == PLAYER_ID
    assert response.json()["items"][0]["team_id"] is None

    response = await client.post(f"/events/{EVENT_ID}/players/{PLAYER_ID}/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    response = await client.patch(
        f"/events/{EVENT_ID}/players/{PLAYER_ID}", json={"team_id": TEAM_ID}
    )
    assert response.status_code == 200
    assert response.json()["id"] == PLAYER_ID
    assert response.json()["team_id"] == TEAM_ID
    assert players.create.await_count == 1


async def test_registration_cannot_bypass_separate_assignment(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(
        f"/events/{EVENT_ID}/players",
        json={"display_name": "Thunder Crab", "team_id": TEAM_ID},
    )
    assert response.status_code == 422
    repositories[0].create.assert_not_awaited()


async def test_registration_in_active_event_returns_conflict(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    client.headers["Origin"] = "http://localhost:5173"
    repositories[2].get.return_value = {"status": EventStatus.ACTIVE}
    response = await client.post(
        f"/events/{EVENT_ID}/players", json={"display_name": "Thunder Crab"}
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Only draft events can be changed"}
    repositories[0].create.assert_not_awaited()


async def test_admin_bulk_approval_and_removal(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(f"/events/{EVENT_ID}/players/approve-all")
    assert response.status_code == 200
    assert response.json() == {"approved_count": 2}
    repositories[0].approve_all.assert_awaited_once_with(EVENT_ID)
    response = await client.delete(f"/events/{EVENT_ID}/players/{PLAYER_ID}")
    assert response.status_code == 200
    assert response.json()["status"] == "removed"
    assert response.json()["team_id"] is None


async def test_player_can_only_request_and_read_own_registration(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    auth = await app.dependency_overrides[get_auth_service]()
    auth.current_user.return_value.is_admin = False
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(f"/events/{EVENT_ID}/players", json={"display_name": "Crab"})
    assert response.status_code == 201
    assert repositories[0].create.call_args.args[2] == USER_ID
    response = await client.get(f"/events/{EVENT_ID}/players/me")
    assert response.status_code == 200
    repositories[0].get_for_user.assert_awaited_with(EVENT_ID, USER_ID)
    for method, path, payload in [
        ("GET", f"/events/{EVENT_ID}/players", None),
        ("POST", f"/events/{EVENT_ID}/players/approve-all", None),
        ("POST", f"/events/{EVENT_ID}/players/{PLAYER_ID}/approve", None),
        ("DELETE", f"/events/{EVENT_ID}/players/{PLAYER_ID}", None),
        ("PATCH", f"/events/{EVENT_ID}/players/{PLAYER_ID}", {"team_id": TEAM_ID}),
        ("POST", f"/events/{EVENT_ID}/teams", {"name": "Crabs"}),
        ("POST", "/events", {}),
    ]:
        response = await client.request(method, path, json=payload)
        assert response.status_code == 403, (method, path, response.text)
    repositories[0].approve.assert_not_awaited()
    repositories[0].approve_all.assert_not_awaited()
    repositories[0].update.assert_not_awaited()
    repositories[0].remove.assert_not_awaited()


async def test_missing_session_untrusted_origin_and_forged_owner_rejected(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    response = await client.post(f"/events/{EVENT_ID}/players", json={"display_name": "Crab"})
    assert response.status_code == 403
    client.headers["Origin"] = "https://untrusted.example"
    response = await client.post(f"/events/{EVENT_ID}/players", json={"display_name": "Crab"})
    assert response.status_code == 403
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(
        f"/events/{EVENT_ID}/players", json={"display_name": "Crab", "user_id": str(ObjectId())}
    )
    assert response.status_code == 422
    auth = await app.dependency_overrides[get_auth_service]()
    auth.current_user.side_effect = AppException(401, "Authentication required")
    response = await client.post(f"/events/{EVENT_ID}/players", json={"display_name": "Crab"})
    assert response.status_code == 401
    repositories[0].create.assert_not_awaited()


async def test_paginated_roster_filters_and_counts(client: AsyncClient, repositories) -> None:
    response = await client.get(
        f"/events/{EVENT_ID}/players",
        params={"group": "assigned", "search": "crab", "team_id": TEAM_ID, "offset": 25},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["counts"] == {"pending": 1, "unassigned": 0, "assigned": 0}
    repositories[0].page.assert_awaited_once_with(
        EVENT_ID,
        status="approved",
        assigned=True,
        search="crab",
        team_id=TEAM_ID,
        offset=25,
        limit=25,
    )
    repositories[1].get.assert_awaited_once_with(EVENT_ID, TEAM_ID)


@pytest.mark.parametrize(
    "params",
    [{"limit": 101}, {"limit": 0}, {"offset": -1}, {"group": "removed"}, {"team_id": "bad"}],
)
async def test_invalid_pagination_rejected(client: AsyncClient, repositories, params) -> None:
    response = await client.get(f"/events/{EVENT_ID}/players", params=params)
    assert response.status_code == 422
    repositories[0].page.assert_not_awaited()


async def test_team_filter_rejects_team_from_another_event(
    client: AsyncClient, repositories
) -> None:
    repositories[1].get.return_value = None
    response = await client.get(f"/events/{EVENT_ID}/players", params={"team_id": TEAM_ID})
    assert response.status_code == 404
    repositories[0].page.assert_not_awaited()


@pytest.mark.parametrize(
    "group, expected_status, assigned",
    [
        ("pending", "pending", None),
        ("unassigned", "approved", False),
        ("assigned", "approved", True),
        ("all", None, None),
    ],
)
async def test_roster_group_semantics(
    client: AsyncClient, repositories, group, expected_status, assigned
) -> None:
    response = await client.get(f"/events/{EVENT_ID}/players", params={"group": group})
    assert response.status_code == 200
    repositories[0].page.assert_awaited_once_with(
        EVENT_ID,
        status=expected_status,
        assigned=assigned,
        search="",
        team_id=None,
        offset=0,
        limit=25,
    )


async def test_selected_approval_and_removal_contract(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    players = repositories[0]
    players.approve_selected.return_value = 1
    players.remove_selected.return_value = 2
    client.headers["Origin"] = "http://localhost:5173"
    ids = [PLAYER_ID, str(ObjectId())]

    response = await client.post(
        f"/events/{EVENT_ID}/players/approve-selected", json={"player_ids": ids}
    )
    assert response.status_code == 200
    assert response.json() == {"changed": 1, "skipped": 1}

    response = await client.post(
        f"/events/{EVENT_ID}/players/remove-selected", json={"player_ids": ids}
    )
    assert response.json() == {"changed": 2, "skipped": 0}


@pytest.mark.parametrize(
    "payload",
    [
        {"player_ids": []},
        {"player_ids": [str(ObjectId()) for _ in range(26)]},
        {"player_ids": [PLAYER_ID, PLAYER_ID]},
        {"player_ids": ["not-an-id"]},
        {"player_ids": [PLAYER_ID], "team_id": TEAM_ID},
    ],
)
async def test_selected_actions_validate_the_selection(
    client: AsyncClient,
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
    payload: dict[str, object],
) -> None:
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(f"/events/{EVENT_ID}/players/approve-selected", json=payload)
    assert response.status_code == 422
    repositories[0].approve_selected.assert_not_awaited()


async def test_selected_actions_require_an_administrator(
    client: AsyncClient, repositories: tuple[AsyncMock, AsyncMock, AsyncMock]
) -> None:
    auth = app.dependency_overrides[get_auth_service]
    service = await auth()
    service.current_user.return_value = CurrentUser(
        id=USER_ID, discord_id="123", username="Player", is_admin=False
    )
    client.headers["Origin"] = "http://localhost:5173"
    response = await client.post(
        f"/events/{EVENT_ID}/players/remove-selected", json={"player_ids": [PLAYER_ID]}
    )
    assert response.status_code == 403
    repositories[0].remove_selected.assert_not_awaited()
