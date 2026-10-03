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
