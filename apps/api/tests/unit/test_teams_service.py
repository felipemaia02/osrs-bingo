from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, DomainValidationError
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.repository import PlayerRepository
from app.modules.teams.repository import TeamRepository
from app.modules.teams.schemas import TeamCreate
from app.modules.teams.service import TeamService


def draft_event() -> dict[str, object]:
    return {"_id": ObjectId(), "status": EventStatus.DRAFT}


async def test_team_creation_rejects_emblem_when_flag_is_disabled() -> None:
    teams = AsyncMock(spec=TeamRepository)
    players = AsyncMock(spec=PlayerRepository)
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = draft_event()
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    with pytest.raises(DomainValidationError, match="emblems are disabled"):
        await service.create(
            str(ObjectId()),
            TeamCreate(name="Thunder Crabs", emblem_url="https://example.com/a.png"),
        )

    teams.create.assert_not_awaited()


async def test_team_creation_requires_draft_event() -> None:
    teams = AsyncMock(spec=TeamRepository)
    players = AsyncMock(spec=PlayerRepository)
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = {"_id": ObjectId(), "status": EventStatus.ACTIVE}
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    with pytest.raises(ConflictError, match="Only draft"):
        await service.create(str(ObjectId()), TeamCreate(name="Thunder Crabs"))


async def test_team_creation_reports_normalized_name_conflict() -> None:
    teams = AsyncMock(spec=TeamRepository)
    players = AsyncMock(spec=PlayerRepository)
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = draft_event()
    teams.create.return_value = None
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    with pytest.raises(ConflictError, match="already exists"):
        await service.create(str(ObjectId()), TeamCreate(name="Thunder Crabs"))


async def test_balance_compares_each_team_with_the_average() -> None:
    sara, zam, guthix = ObjectId(), ObjectId(), ObjectId()
    teams = AsyncMock(spec=TeamRepository)
    teams.list.return_value = [
        {"_id": team_id, "name": name, "color": None}
        for team_id, name in [(sara, "Saradomin"), (zam, "Zamorak"), (guthix, "Guthix")]
    ]
    players = AsyncMock(spec=PlayerRepository)
    players.team_experience.return_value = [
        {
            "_id": sara,
            "player_count": 6,
            "boss_kc_total": 67605,
            "ehb_total": 1100.0,
            "captains": ["felps_"],
        },
        {
            "_id": zam,
            "player_count": 6,
            "boss_kc_total": 64150,
            "ehb_total": 1000.0,
            "captains": [],
        },
        {
            "_id": guthix,
            "player_count": 5,
            "boss_kc_total": 43600,
            "ehb_total": 700.0,
            "captains": [],
        },
    ]
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = draft_event()
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    balance = await service.balance(str(ObjectId()))

    assert balance.average_ehb == 933.33
    rows = [
        (t.name, t.ehb_vs_average, t.balanced, t.players_short, t.captain) for t in balance.teams
    ]
    assert rows == [
        ("Saradomin", 18, False, 0, "felps_"),
        ("Zamorak", 7, True, 0, None),
        ("Guthix", -25, False, 1, None),
    ]


async def test_balance_of_teams_without_players_is_zero() -> None:
    teams = AsyncMock(spec=TeamRepository)
    teams.list.return_value = [{"_id": ObjectId(), "name": "Empty", "color": None}]
    players = AsyncMock(spec=PlayerRepository)
    players.team_experience.return_value = []
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = draft_event()
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    balance = await service.balance(str(ObjectId()))

    assert balance.average_ehb == 0
    assert balance.teams[0].ehb_vs_average == 0 and balance.teams[0].balanced


async def test_draft_preview_lists_captains_and_players_without_a_team() -> None:
    sara, guthix = ObjectId(), ObjectId()
    now = datetime.now(UTC)
    teams = AsyncMock(spec=TeamRepository)
    teams.list.return_value = [
        {"_id": sara, "name": "Saradomin", "color": "#2F5592"},
        {"_id": guthix, "name": "Guthix", "color": None},
    ]
    players = AsyncMock(spec=PlayerRepository)
    players.captains.return_value = [
        {"team_id": sara, "display_name": "felps_", "ehb_total": 1229.1},
    ]
    players.page.return_value = (
        [
            {
                "_id": ObjectId(),
                "event_id": ObjectId(),
                "team_id": None,
                "status": "approved",
                "display_name": "Ironman Iris",
                "normalized_display_name": "ironman iris",
                "ehb_total": 845.2,
                "created_at": now,
                "updated_at": now,
            }
        ],
        1,
    )
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = draft_event()
    service = TeamService(teams, players, events, SimpleNamespace(team_emblems_enabled=False))

    preview = await service.draft_preview(str(ObjectId()))

    assert [(c.team_name, c.captain, c.captain_ehb) for c in preview.captains] == [
        ("Saradomin", "felps_", 1229.1),
        ("Guthix", None, None),
    ]
    assert [p.display_name for p in preview.players] == ["Ironman Iris"]
    query = players.page.await_args.kwargs
    assert query["status"] == "approved" and query["assigned"] is False
