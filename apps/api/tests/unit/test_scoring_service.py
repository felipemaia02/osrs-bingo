from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.scoring.service import ScoringService
from app.modules.submissions.repository import SubmissionRepository
from app.modules.teams.repository import TeamRepository

EVENT_ID = ObjectId()
SA, ZA, GU = ObjectId(), ObjectId(), ObjectId()
HAL, PETE, GONE = ObjectId(), ObjectId(), ObjectId()
USER = CurrentUser(id=str(ObjectId()), discord_id="1", username="Hal", is_admin=False)


def board() -> dict[str, Any]:
    # 3x3 board, every tile worth 10 with requirement 2.
    return {
        "size": 3,
        "positions": [
            {
                "position": (row - 1) * 3 + column,
                "row": row,
                "column": column,
                "card": {"tile_score": 10, "completion_requirement": 2},
            }
            for row in range(1, 4)
            for column in range(1, 4)
        ],
    }


def accepted(team: ObjectId, player: ObjectId, position: int, weight: float = 1) -> dict[str, Any]:
    return {
        "team_id": team,
        "player_id": player,
        "position": position,
        "drop_key": "unique",
        "drop_name": "Unique",
        "progress_weight": weight,
        "quantity": 1,
    }


def player(key: ObjectId, team: ObjectId | None, name: str, status: str = "approved") -> Any:
    return {"_id": key, "team_id": team, "display_name": name, "status": status}


@pytest.fixture
def deps() -> dict[str, Any]:
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = {
        "_id": EVENT_ID,
        "name": "Autumn",
        "status": "active",
        "row_bonus": 25,
        "column_bonus": 30,
        "start_at": datetime.now(UTC),
        "end_at": datetime.now(UTC),
    }
    boards = AsyncMock(spec=BoardRepository)
    boards.get_by_event.return_value = board()
    teams = AsyncMock(spec=TeamRepository)
    team_docs = [
        {"_id": SA, "name": "Saradomin", "color": "#2F5592"},
        {"_id": ZA, "name": "Zamorak", "color": None},
        {"_id": GU, "name": "Guthix", "color": None},
    ]
    teams.list.return_value = team_docs
    teams.get.return_value = team_docs[0]
    players = AsyncMock(spec=PlayerRepository)
    players.get_for_user.return_value = player(HAL, SA, "Holy Hal")
    players.list_assigned.return_value = [
        player(HAL, SA, "Holy Hal"),
        player(PETE, ZA, "Prayer Pete"),
    ]
    players.get_many.return_value = {GONE: player(GONE, None, "Gone Gary", "removed")}
    submissions = AsyncMock(spec=SubmissionRepository)
    # Saradomin completes row 1 (3 tiles); Zamorak completes tile 1 only; a removed
    # player's accepted drop still counts for the team stored on it (Guthix).
    submissions.accepted_drops.return_value = [
        *(accepted(SA, HAL, position, 2) for position in (1, 2, 3)),
        accepted(ZA, PETE, 1, 1),
        accepted(ZA, PETE, 1, 1),
        accepted(GU, GONE, 5, 1),
    ]
    service = ScoringService(events, boards, teams, players, submissions)
    return {"service": service, "events": events, "players": players}


async def test_player_sees_their_own_team_progress(deps: dict[str, Any]) -> None:
    score = await deps["service"].own_team(str(EVENT_ID), USER)

    assert score.team_name == "Saradomin"
    assert (score.completed_tiles, score.tile_points, score.completed_rows) == (3, 30, [1])
    assert (score.row_points, score.column_points, score.total) == (25, 0, 55)
    first = score.tiles[0]
    assert (first.progress, first.requirement, first.complete, first.points) == (2, 2, True, 10)
    assert first.drops[0].count == 1 and first.drops[0].progress == 2
    assert score.tile_count == 9 and score.row_bonus == 25


@pytest.mark.parametrize(
    ("registration", "status_code"),
    [(None, 403), (player(HAL, None, "Holy Hal"), 403), (player(HAL, SA, "x", "pending"), 403)],
)
async def test_only_players_on_a_team_have_a_team_score(
    deps: dict[str, Any], registration: Any, status_code: int
) -> None:
    deps["players"].get_for_user.return_value = registration
    with pytest.raises(AppException) as error:
        await deps["service"].own_team(str(EVENT_ID), USER)
    assert error.value.status_code == status_code


async def test_draft_events_have_no_player_score(deps: dict[str, Any]) -> None:
    deps["events"].get.return_value = {**deps["events"].get.return_value, "status": "draft"}
    with pytest.raises(AppException, match="once the event is active"):
        await deps["service"].own_team(str(EVENT_ID), USER)


async def test_ranking_orders_teams_with_ties_and_lists_contributions(
    deps: dict[str, Any],
) -> None:
    result = await deps["service"].ranking(str(EVENT_ID))

    rows = [(team.team_name, team.position, team.tied, team.total) for team in result.teams]
    assert rows == [("Saradomin", 1, False, 55), ("Zamorak", 2, False, 10), ("Guthix", 3, False, 0)]
    assert result.teams[0].member_count == 1 and result.teams[2].member_count == 0
    contributions = {row.display_name: row.contribution for row in result.players}
    # Hal: 3 drops of weight 2 on requirement-2 tiles worth 10 = 30.
    assert contributions == {"Holy Hal": 30.0, "Prayer Pete": 10.0, "Gone Gary": 5.0}
    assert result.size == 3 and result.column_bonus == 30


async def test_equal_totals_share_the_position(deps: dict[str, Any]) -> None:
    deps["service"]._submissions.accepted_drops.return_value = []
    result = await deps["service"].ranking(str(EVENT_ID))
    assert {(team.position, team.tied) for team in result.teams} == {(1, True)}
