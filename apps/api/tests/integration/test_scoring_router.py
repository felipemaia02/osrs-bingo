from collections.abc import Iterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.scoring.router import get_scoring_service

EVENT_ID = "66d000000000000000000001"


@pytest.fixture
def services() -> Iterator[tuple[AsyncMock, AsyncMock]]:
    auth, scoring = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="Hal", is_admin=False
    )

    async def auth_override() -> AsyncMock:
        return auth

    async def scoring_override() -> AsyncMock:
        return scoring

    app.dependency_overrides[get_auth_service] = auth_override
    app.dependency_overrides[get_scoring_service] = scoring_override
    try:
        yield auth, scoring
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_scoring_service, None)


async def test_ranking_is_admin_only(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    response = await client.get(f"/admin/events/{EVENT_ID}/ranking")
    assert response.status_code == 403
    services[1].ranking.assert_not_awaited()


async def test_team_score_requires_login(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.side_effect = AppException(401, "Authentication required")
    response = await client.get(f"/events/{EVENT_ID}/score/me")
    assert response.status_code == 401
    services[1].own_team.assert_not_awaited()


async def test_team_page_requires_login(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.side_effect = AppException(401, "Authentication required")
    response = await client.get(f"/events/{EVENT_ID}/team/me")
    assert response.status_code == 401
    services[1].own_team_home.assert_not_awaited()


async def test_team_page_takes_the_team_from_the_caller(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[1].own_team_home.return_value = {
        "event_id": EVENT_ID,
        "team_id": "66d000000000000000000003",
        "team_name": "Saradomin",
        "team_color": None,
        "emblem_url": None,
        "members": [],
        "recent_drops": [],
    }
    response = await client.get(f"/events/{EVENT_ID}/team/me")
    assert response.status_code == 200
    assert response.json()["team_name"] == "Saradomin"
    event_id, user = services[1].own_team_home.await_args.args
    assert event_id == EVENT_ID and user.username == "Hal"


async def test_team_board_is_admin_only(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    response = await client.get(f"/admin/events/{EVENT_ID}/teams/66d000000000000000000003/score")
    assert response.status_code == 403
    services[1].team_score.assert_not_awaited()
