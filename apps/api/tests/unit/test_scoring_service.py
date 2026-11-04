from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException, NotFoundError
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
        "row_bonus": 25,
        "column_bonus": 30,
        "positions": [
            {
                "position": (row - 1) * 3 + column,
                "row": row,
                "column": column,
                "card": {
                    "tile_score": 10,
                    "completion_requirement": 2,
                    "drops": [
                        {"key": "unique", "name": "Unique", "progress_weight": 1},
                        {"key": "rare", "name": "Rare", "progress_weight": 2},
                    ],
                },
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
        # The board card decides the weight (036): "rare" is worth 2, "unique" 1.
        "drop_key": "rare" if weight == 2 else "unique",
        "drop_name": "Rare" if weight == 2 else "Unique",
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
    return {"service": service, "events": events, "players": players, "boards": boards}


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


async def test_live_card_fixes_rescore_accepted_drops_with_the_new_weights(
    deps: dict[str, Any],
) -> None:
    """036: the square's current card decides weights; removed drops stop counting."""
    fixed = board()
    first = fixed["positions"][0]["card"]
    first["drops"] = [{"key": "rare", "name": "Rare", "progress_weight": 1}]  # was 2; no "unique"
    deps["service"]._boards.get_by_event.return_value = fixed

    score = await deps["service"].own_team(str(EVENT_ID), USER)

    assert score.tiles[0].progress == 1 and not score.tiles[0].complete
    ranking = await deps["service"].ranking(str(EVENT_ID))
    zamorak = next(team for team in ranking.teams if team.team_name == "Zamorak")
    assert zamorak.total == 0  # its two "unique" drops on tile 1 no longer count


# --- Team home (feature 050) ---

ACCEPTED_AT = datetime(2026, 11, 1, 12, tzinfo=UTC)


def roster_row(key: ObjectId, name: str, role: str | None = None) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "_id": key,
        "event_id": EVENT_ID,
        "user_id": ObjectId(),
        "display_name": name,
        "status": "approved",
        "team_id": SA,
        "role": role,
        "discord_username": name.lower(),
        "timezone": "Europe/London",
        "activity": "one_to_three_h",
        "created_at": now,
        "updated_at": now,
    }


def recent(player: ObjectId, position: int, weight: float, reviewed: datetime) -> dict[str, Any]:
    return {
        "_id": ObjectId(),
        "player_id": player,
        "position": position,
        "card_name": f"Card {position}",
        "drop_key": "rare" if weight == 2 else "unique",
        "drop_name": "Rare" if weight == 2 else "Unique",
        "quantity": 1,
        "reviewed_at": reviewed,
        "submitted_at": reviewed,
    }


@pytest.fixture
def team_home(deps: dict[str, Any]) -> dict[str, Any]:
    sam = ObjectId()
    deps["players"].page.return_value = (
        [roster_row(HAL, "Holy Hal", "captain"), roster_row(sam, "Sam"), roster_row(PETE, "Pete")],
        3,
    )
    submissions = deps["service"]._submissions
    # Hal: 3 rare drops on tiles 1-3 (10 points each). Pete moved to Saradomin later: his
    # two Zamorak drops don't count here. Sam: nothing.
    submissions.recent_accepted_drops.return_value = [
        recent(HAL, 3, 2, ACCEPTED_AT),
        recent(GONE, 5, 1, ACCEPTED_AT),
    ]
    return {**deps, "sam": sam}


async def test_team_home_ranks_only_own_team_members_by_points(team_home: dict[str, Any]) -> None:
    result = await team_home["service"].own_team_home(str(EVENT_ID), USER)

    assert (result.team_name, result.team_color) == ("Saradomin", "#2F5592")
    rows = [(m.display_name, m.position, m.tied, m.points, m.drop_count) for m in result.members]
    # Hal 30 points; Pete's Zamorak drops stay with Zamorak, so he ties with Sam on 0.
    assert rows == [("Holy Hal", 1, False, 30, 3), ("Pete", 2, True, 0, 0), ("Sam", 2, True, 0, 0)]
    assert result.members[0].role == "captain"
    assert result.members[0].timezone == "Europe/London"
    page = team_home["players"].page.await_args
    assert page.kwargs["team_id"] == str(SA)
    assert page.kwargs["status"] == "approved"


async def test_team_home_recent_drops_show_player_and_points(team_home: dict[str, Any]) -> None:
    result = await team_home["service"].own_team_home(str(EVENT_ID), USER)

    first, second = result.recent_drops
    assert (first.player_name, first.card_name, first.drop_name, first.points) == (
        "Holy Hal",
        "Card 3",
        "Rare",
        10,
    )
    assert first.accepted_at == ACCEPTED_AT
    # A player no longer on the team is still named.
    assert (second.player_name, second.points) == ("Gone Gary", 5)
    call = team_home["service"]._submissions.recent_accepted_drops.await_args
    assert call.args[1] == SA and call.args[2] == 10


async def test_team_home_waits_for_the_event_to_start(team_home: dict[str, Any]) -> None:
    team_home["events"].get.return_value = {
        **team_home["events"].get.return_value,
        "status": "draft",
    }
    with pytest.raises(AppException, match="once the event is active") as error:
        await team_home["service"].own_team_home(str(EVENT_ID), USER)
    assert error.value.status_code == 404


async def test_team_home_needs_a_team(team_home: dict[str, Any]) -> None:
    team_home["players"].get_for_user.return_value = player(HAL, None, "Holy Hal")
    with pytest.raises(AppException) as error:
        await team_home["service"].own_team_home(str(EVENT_ID), USER)
    assert error.value.status_code == 403


async def test_admin_sees_any_team_board_matching_the_ranking(deps: dict[str, Any]) -> None:
    """058: the team board in the ranking shows the same numbers as its ranking row."""
    zamorak = {"_id": ZA, "name": "Zamorak", "color": None}
    deps["service"]._teams.get.return_value = zamorak

    score = await deps["service"].team_score(str(EVENT_ID), str(ZA))
    ranking = await deps["service"].ranking(str(EVENT_ID))

    row = next(team for team in ranking.teams if team.team_name == "Zamorak")
    assert score.team_name == "Zamorak"
    assert (score.completed_tiles, score.total) == (row.completed_tiles, row.total) == (1, 10)
    assert [tile.complete for tile in score.tiles][:2] == [True, False]


async def test_team_board_of_another_event_is_not_found(deps: dict[str, Any]) -> None:
    deps["service"]._teams.get.return_value = None
    with pytest.raises(NotFoundError):
        await deps["service"].team_score(str(EVENT_ID), str(ObjectId()))
