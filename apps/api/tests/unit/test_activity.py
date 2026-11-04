"""Who is working on which tile (feature 061)."""

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException
from app.modules.activity.repository import ActivityRepository
from app.modules.activity.service import MARK_LIFETIME, ActivityService
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.teams.repository import TeamRepository

EVENT = ObjectId()
CRABS, BEARS = ObjectId(), ObjectId()
HAL, PETE, GONE = ObjectId(), ObjectId(), ObjectId()
USER = CurrentUser(id=str(ObjectId()), discord_id="1", username="Hal", is_admin=False)
NOW = datetime.now(UTC)


def member(player_id: ObjectId, team: ObjectId | None, name: str, **extra: Any) -> Any:
    return {
        "_id": player_id,
        "event_id": EVENT,
        "team_id": team,
        "display_name": name,
        "status": "approved",
        **extra,
    }


def mark(player_id: ObjectId, position: int, minutes_ago: int = 5) -> dict[str, Any]:
    since = NOW - timedelta(minutes=minutes_ago)
    return {
        "player_id": player_id,
        "position": position,
        "since": since,
        "expires_at": since + MARK_LIFETIME,
    }


@pytest.fixture
def deps() -> dict[str, Any]:
    activity = AsyncMock(spec=ActivityRepository)
    activity.for_team.return_value = [mark(PETE, 4, 30), mark(HAL, 4), mark(GONE, 7)]
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = {"_id": EVENT, "status": "active"}
    players = AsyncMock(spec=PlayerRepository)
    players.get_for_user.return_value = member(HAL, CRABS, "Holy Hal")
    # Gone Gary moved to the Bears: his old mark no longer shows (BR-003).
    players.approved_with_team.return_value = [
        member(HAL, CRABS, "Holy Hal"),
        member(PETE, CRABS, "Prayer Pete"),
        member(GONE, BEARS, "Gone Gary"),
    ]
    teams = AsyncMock(spec=TeamRepository)
    teams.get.return_value = {"_id": CRABS, "event_id": EVENT, "name": "Crabs"}
    boards = AsyncMock(spec=BoardRepository)
    boards.get_by_event.return_value = {"positions": [{"position": p} for p in range(1, 10)]}
    service = ActivityService(activity, events, players, teams, boards)
    return {"service": service, "activity": activity, "events": events, "players": players}


async def test_team_sees_who_works_on_each_tile_with_you_first(deps: dict[str, Any]) -> None:
    response = await deps["service"].own_team(str(EVENT), USER)

    assert [tile.position for tile in response.tiles] == [4]
    names = [(worker.name, worker.is_you) for worker in response.tiles[0].players]
    assert names == [("Holy Hal", True), ("Prayer Pete", False)]
    deps["activity"].for_team.assert_awaited_once()
    assert deps["activity"].for_team.await_args.args[:2] == (EVENT, CRABS)


async def test_marking_lasts_seven_days_and_marking_again_renews_it(deps: dict[str, Any]) -> None:
    await deps["service"].start(str(EVENT), 4, USER)

    event_id, team_id, player_id, position, now, expires = deps["activity"].mark.await_args.args
    assert (event_id, team_id, player_id, position) == (EVENT, CRABS, HAL, 4)
    assert expires - now == timedelta(days=7)


async def test_stop_removes_only_the_players_own_mark(deps: dict[str, Any]) -> None:
    await deps["service"].stop(str(EVENT), 4, USER)

    deps["activity"].unmark.assert_awaited_once_with(EVENT, CRABS, HAL, 4)


async def test_tiles_outside_the_board_are_refused(deps: dict[str, Any]) -> None:
    with pytest.raises(AppException) as caught:
        await deps["service"].start(str(EVENT), 42, USER)
    assert caught.value.status_code == 404
    deps["activity"].mark.assert_not_awaited()


@pytest.mark.parametrize(
    "registration",
    [None, member(HAL, None, "Holy Hal"), member(HAL, CRABS, "Holy Hal", status="pending")],
)
async def test_only_players_on_a_team_mark_tiles(deps: dict[str, Any], registration: Any) -> None:
    deps["players"].get_for_user.return_value = registration
    with pytest.raises(AppException) as caught:
        await deps["service"].start(str(EVENT), 4, USER)
    assert caught.value.status_code == 403


async def test_marks_only_change_while_the_event_is_active(deps: dict[str, Any]) -> None:
    deps["events"].get.return_value = {"_id": EVENT, "status": "finished"}
    with pytest.raises(AppException) as caught:
        await deps["service"].start(str(EVENT), 4, USER)
    assert caught.value.status_code == 409


async def test_admins_read_any_team(deps: dict[str, Any]) -> None:
    response = await deps["service"].any_team(str(EVENT), str(CRABS))

    assert [worker.is_you for worker in response.tiles[0].players] == [False, False]
