"""Feature 048: a Discord bot calls the API with its own key."""

import logging
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app import main
from app.core.config import settings
from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.dependencies import SESSION_COOKIE, get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.router import get_board_service
from app.modules.boards.schemas import BoardResponse, BoardStatus
from app.modules.bots import dependencies as bot_dependencies
from app.modules.bots.schemas import BotKey, BotScope
from app.modules.bots.service import invalid_key
from app.modules.events.router import get_event_service
from app.modules.scoring.router import get_scoring_service
from app.modules.scoring.schemas import TeamScoreResponse
from app.modules.submissions.router import get_submission_service
from app.modules.teams.router import get_team_service
from tests.integration.test_submissions_router import response as submission_response

EVENT_ID = "66d000000000000000000001"
PLAYER_DISCORD_ID = "123456789012345678"
NOW = datetime.now(UTC)
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def key(*scopes: BotScope) -> BotKey:
    return BotKey(id="66d0000000000000000000b1", name="clan-bot", scopes=frozenset(scopes))


def bearer(acting: str | None = PLAYER_DISCORD_ID) -> dict[str, str]:
    headers = {"Authorization": "Bearer secret-key"}
    if acting is not None:
        headers["X-Acting-User"] = acting
    return headers


def provider(service: AsyncMock) -> Callable[[], AsyncMock]:
    return lambda: service


@dataclass
class Services:
    keys: AsyncMock
    auth: AsyncMock
    boards: AsyncMock
    teams: AsyncMock
    scoring: AsyncMock
    submissions: AsyncMock
    events: AsyncMock


@pytest.fixture
def services(monkeypatch: pytest.MonkeyPatch) -> Iterator[Services]:
    found = Services(*(AsyncMock() for _ in range(7)))
    found.events.list.return_value = []
    found.keys.authenticate.return_value = key(*BotScope)
    found.auth.acting_user.return_value = CurrentUser(
        id="66d000000000000000000002",
        discord_id=PLAYER_DISCORD_ID,
        username="Hal",
        is_admin=False,
    )
    found.auth.current_user.return_value = CurrentUser(
        id="66d000000000000000000003", discord_id="9", username="Web", is_admin=True
    )
    found.boards.get_public.return_value = BoardResponse(
        event_id=EVENT_ID,
        status=BoardStatus.PUBLISHED,
        revision=1,
        size=3,
        complete=True,
        positions=[],
        created_at=NOW,
        updated_at=NOW,
    )
    found.teams.list.return_value = []
    found.scoring.own_team.return_value = TeamScoreResponse(
        event_id=EVENT_ID,
        team_id="66d000000000000000000004",
        team_name="Crabs",
        team_color=None,
        total=7,
        tile_points=7,
        completed_tiles=1,
        tile_count=9,
        bonus_points=0,
        completed_bonus=0,
        bonus_count=0,
        completed_rows=[],
        completed_columns=[],
        row_points=0,
        column_points=0,
        row_bonus=None,
        column_bonus=None,
        tiles=[],
        calculated_at=NOW,
    )
    found.submissions.submit.return_value = submission_response()
    monkeypatch.setattr(bot_dependencies, "get_bot_key_service", lambda _request: found.keys)
    overrides = {
        get_auth_service: found.auth,
        get_board_service: found.boards,
        get_team_service: found.teams,
        get_scoring_service: found.scoring,
        get_submission_service: found.submissions,
        get_event_service: found.events,
    }
    for dependency, service in overrides.items():
        app.dependency_overrides[dependency] = provider(service)
    try:
        yield found
    finally:
        for dependency in overrides:
            app.dependency_overrides.pop(dependency, None)


async def test_board_and_teams_with_read_scopes(client: AsyncClient, services: Services) -> None:
    services.keys.authenticate.return_value = key(BotScope.BOARDS_READ, BotScope.TEAMS_READ)

    board = await client.get(f"/events/{EVENT_ID}/board", headers=bearer(acting=None))
    teams = await client.get(f"/events/{EVENT_ID}/teams", headers=bearer())

    assert (board.status_code, teams.status_code) == (200, 200)
    assert board.json()["event_id"] == EVENT_ID
    services.keys.authenticate.assert_awaited_with("Bearer secret-key")
    services.auth.acting_user.assert_not_awaited()


async def test_events_are_listed_with_the_events_scope(
    client: AsyncClient, services: Services
) -> None:
    services.keys.authenticate.return_value = key(BotScope.EVENTS_READ)

    listed = await client.get("/events?status=active", headers=bearer(acting=None))
    one_event = await client.get(f"/events/{EVENT_ID}", headers=bearer(acting=None))
    mine = await client.get("/events/mine", headers=bearer())

    assert listed.status_code == 200 and listed.json() == {"items": []}
    assert services.events.list.await_args.args[0] == "active"
    assert (one_event.status_code, mine.status_code) == (403, 403)


async def test_events_need_their_scope(client: AsyncClient, services: Services) -> None:
    services.keys.authenticate.return_value = key(BotScope.BOARDS_READ)
    result = await client.get("/events", headers=bearer(acting=None))
    assert result.status_code == 403
    services.events.list.assert_not_awaited()


async def test_score_is_read_for_the_acting_player_and_ignores_cookies(
    client: AsyncClient, services: Services
) -> None:
    client.cookies.set(SESSION_COOKIE, "admin-session")
    try:
        result = await client.get(f"/events/{EVENT_ID}/score/me", headers=bearer())
    finally:
        client.cookies.clear()

    assert result.status_code == 200 and result.json()["team_name"] == "Crabs"
    services.auth.acting_user.assert_awaited_once_with(PLAYER_DISCORD_ID)
    services.auth.current_user.assert_not_awaited()
    user = services.scoring.own_team.await_args.args[1]
    assert user.discord_id == PLAYER_DISCORD_ID and not user.is_admin


async def test_bot_sends_a_submission_without_origin(
    client: AsyncClient, services: Services, request_limiter_override: AsyncMock
) -> None:
    result = await client.post(
        f"/events/{EVENT_ID}/submissions",
        data={"kind": "drop", "position": "1", "drop_key": "skeletal-visage"},
        files={"screenshot": ("proof.png", PNG, "image/png")},
        headers=bearer(),
    )

    assert result.status_code == 201
    args = services.submissions.submit.await_args.args
    assert args[1].discord_id == PLAYER_DISCORD_ID and args[-1] == "clan-bot"
    limits = [call.args[0] for call in request_limiter_override.check.await_args_list]
    assert limits == ["bot", "mutation"]


async def test_player_rules_still_apply_to_bot_submissions(
    client: AsyncClient, services: Services
) -> None:
    services.submissions.submit.side_effect = AppException(403, "Not eligible")
    result = await client.post(
        f"/events/{EVENT_ID}/submissions",
        data={"kind": "drop", "position": "1"},
        files={"screenshot": ("proof.png", PNG, "image/png")},
        headers=bearer(),
    )
    assert result.status_code == 403


async def test_routes_outside_the_key_scopes_are_forbidden(
    client: AsyncClient, services: Services
) -> None:
    services.keys.authenticate.return_value = key(BotScope.BOARDS_READ)

    result = await client.get(f"/events/{EVENT_ID}/score/me", headers=bearer())

    assert result.status_code == 403
    services.scoring.own_team.assert_not_awaited()


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", f"/admin/events/{EVENT_ID}/ranking"),
        ("POST", "/admin/submissions/66d0000000000000000000aa/accept"),
        ("GET", f"/events/{EVENT_ID}/submissions/me"),
        ("GET", "/auth/me"),
        ("GET", "/health"),
    ],
)
async def test_other_routes_never_accept_a_key(
    client: AsyncClient, services: Services, method: str, path: str
) -> None:
    result = await client.request(method, path, headers=bearer())
    assert result.status_code == 403
    services.auth.current_user.assert_not_awaited()


async def test_invalid_keys_get_401(client: AsyncClient, services: Services) -> None:
    services.keys.authenticate.side_effect = invalid_key()

    result = await client.get(f"/events/{EVENT_ID}/board", headers=bearer())

    assert result.status_code == 401
    assert result.headers["www-authenticate"] == "Bearer"
    assert result.json() == {"detail": "Invalid bot key"}


async def test_keys_over_their_limit_get_429(
    client: AsyncClient, services: Services, request_limiter_override: AsyncMock
) -> None:
    request_limiter_override.check.side_effect = AppException(429, "Too many requests")

    result = await client.get(f"/events/{EVENT_ID}/board", headers=bearer())

    assert result.status_code == 429
    request_limiter_override.check.assert_awaited_once_with(
        "bot", "66d0000000000000000000b1", settings.bot_requests_per_minute
    )


@pytest.mark.parametrize("acting", [None, "", "not-a-number", "1" * 21])
async def test_acting_routes_need_a_valid_discord_id(
    client: AsyncClient, services: Services, acting: str | None
) -> None:
    result = await client.get(f"/events/{EVENT_ID}/score/me", headers=bearer(acting))
    assert result.status_code == 400
    services.auth.acting_user.assert_not_awaited()


async def test_unknown_acting_user_gets_404(client: AsyncClient, services: Services) -> None:
    services.auth.acting_user.side_effect = AppException(404, "Log in on the site first")
    result = await client.get(f"/events/{EVENT_ID}/score/me", headers=bearer())
    assert result.status_code == 404


async def test_bots_are_refused_during_maintenance(
    client: AsyncClient, services: Services, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "maintenance_mode", True)
    result = await client.get(f"/events/{EVENT_ID}/board", headers=bearer())
    assert result.status_code == 503
    services.keys.authenticate.assert_not_awaited()


async def test_bot_requests_are_logged_without_the_key(
    client: AsyncClient, services: Services, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO):
        await client.get(f"/events/{EVENT_ID}/score/me", headers=bearer())

    completed = [record.getMessage() for record in caplog.records]
    line = next(message for message in completed if message.startswith("request_completed"))
    assert "bot_key='clan-bot'" in line and f"acting_discord_id='{PLAYER_DISCORD_ID}'" in line
    assert all("secret-key" not in message for message in completed)


async def test_website_users_keep_the_origin_check(client: AsyncClient, services: Services) -> None:
    client.cookies.set(SESSION_COOKIE, "session")
    try:
        result = await client.post(
            f"/events/{EVENT_ID}/submissions",
            data={"kind": "drop", "position": "1"},
            files={"screenshot": ("proof.png", PNG, "image/png")},
        )
    finally:
        client.cookies.clear()

    assert result.status_code == 403 and result.json() == {"detail": "Untrusted request origin"}
    services.keys.authenticate.assert_not_awaited()


def test_api_docs_are_only_served_in_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    assert main.docs_url("/docs") is None
    monkeypatch.setattr(settings, "app_env", "development")
    assert main.docs_url("/docs") == "/docs"
