from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import (
    PlayerCreate,
    PlayerListQuery,
    PlayerUpdate,
    RegistrationStatus,
)
from app.modules.players.service import PlayerService
from app.modules.teams.repository import TeamRepository

EVENT_ID, USER_ID, PLAYER_ID, TEAM_ID = (str(ObjectId()) for _ in range(4))


def registration(status: RegistrationStatus = RegistrationStatus.PENDING) -> dict[str, object]:
    now = datetime.now(UTC)
    return {
        "_id": ObjectId(PLAYER_ID),
        "event_id": ObjectId(EVENT_ID),
        "user_id": ObjectId(USER_ID),
        "team_id": None,
        "status": status,
        "display_name": "Thunder Crab",
        "normalized_display_name": "thunder crab",
        "created_at": now,
        "updated_at": now,
    }


@pytest.fixture
def repositories() -> tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock]:
    players, teams, events = (
        AsyncMock(spec=PlayerRepository),
        AsyncMock(spec=TeamRepository),
        AsyncMock(spec=EventRepository),
    )
    events.get.return_value = {"status": EventStatus.DRAFT}
    players.get_for_user.return_value = None
    players.create.return_value = registration()
    return PlayerService(players, teams, events), players, teams, events


async def test_registration_starts_pending_without_team(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, teams, _ = repositories
    payload = PlayerCreate(display_name="Thunder Crab")
    result = await service.create(EVENT_ID, payload, USER_ID)
    assert result.status == RegistrationStatus.PENDING
    assert result.team_id is None
    players.create.assert_awaited_once_with(EVENT_ID, payload, USER_ID)
    teams.get.assert_not_awaited()


@pytest.mark.parametrize("status", [EventStatus.ACTIVE, EventStatus.FINISHED])
async def test_mutations_require_draft_event(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock], status: EventStatus
) -> None:
    service, players, _, events = repositories
    events.get.return_value = {"status": status}
    operations = [
        service.create(EVENT_ID, PlayerCreate(display_name="Crab"), USER_ID),
        service.approve(EVENT_ID, PLAYER_ID),
        service.approve_all(EVENT_ID),
        service.update(EVENT_ID, PLAYER_ID, PlayerUpdate(team_id=TEAM_ID)),
        service.remove(EVENT_ID, PLAYER_ID),
    ]
    for operation in operations:
        with pytest.raises(ConflictError, match="Only draft"):
            await operation
    players.create.assert_not_awaited()
    players.approve.assert_not_awaited()
    players.approve_all.assert_not_awaited()
    players.update.assert_not_awaited()
    players.remove.assert_not_awaited()


async def test_registration_requires_existing_event(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, events = repositories
    events.get.return_value = None
    with pytest.raises(NotFoundError, match="Event"):
        await service.create(EVENT_ID, PlayerCreate(display_name="Crab"), USER_ID)
    players.create.assert_not_awaited()


async def test_duplicate_user_or_name_returns_conflict(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.get_for_user.return_value = registration()
    with pytest.raises(ConflictError, match="Already registered"):
        await service.create(EVENT_ID, PlayerCreate(display_name="Crab"), USER_ID)
    players.create.assert_not_awaited()
    players.get_for_user.return_value = None
    players.create.return_value = None
    with pytest.raises(ConflictError, match="Registration already exists"):
        await service.create(EVENT_ID, PlayerCreate(display_name="Crab"), USER_ID)


async def test_assignment_rejects_team_from_another_event(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, teams, _ = repositories
    teams.get.return_value = None
    with pytest.raises(NotFoundError, match="Team"):
        await service.update(EVENT_ID, PLAYER_ID, PlayerUpdate(team_id=TEAM_ID))
    players.update.assert_not_awaited()


@pytest.mark.parametrize("current", [RegistrationStatus.PENDING, RegistrationStatus.REMOVED])
async def test_assignment_rejects_unapproved_registration(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock], current: RegistrationStatus
) -> None:
    service, players, _, _ = repositories
    players.update.return_value = None
    players.get.return_value = registration(current)
    with pytest.raises(ConflictError, match="Only approved"):
        await service.update(EVENT_ID, PLAYER_ID, PlayerUpdate(team_id=TEAM_ID))
    players.create.assert_not_awaited()


async def test_approval_and_removal_do_not_create_registration(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.approve.return_value = registration(RegistrationStatus.APPROVED)
    assert (await service.approve(EVENT_ID, PLAYER_ID)).team_id is None
    players.approve_all.return_value = 2
    assert await service.approve_all(EVENT_ID) == 2
    players.approve_all.assert_awaited_once_with(EVENT_ID)
    players.remove.return_value = registration(RegistrationStatus.REMOVED)
    assert (await service.remove(EVENT_ID, PLAYER_ID)).status == RegistrationStatus.REMOVED
    players.create.assert_not_awaited()


async def test_stale_approval_cannot_revive_removed_record(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.approve.return_value = None
    players.get.return_value = registration(RegistrationStatus.REMOVED)
    with pytest.raises(ConflictError, match="Only pending"):
        await service.approve(EVENT_ID, PLAYER_ID)


async def test_missing_cross_event_registration_rejected(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.get.return_value = None
    players.approve.return_value = players.remove.return_value = players.update.return_value = None
    for operation in [
        service.approve(EVENT_ID, PLAYER_ID),
        service.remove(EVENT_ID, PLAYER_ID),
        service.update(EVENT_ID, PLAYER_ID, PlayerUpdate(team_id=TEAM_ID)),
    ]:
        with pytest.raises(NotFoundError, match="Player"):
            await operation


async def test_selected_actions_report_changed_and_skipped(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    ids = [str(ObjectId()) for _ in range(3)]
    players.approve_selected.return_value = 2
    players.remove_selected.return_value = 3

    approved = await service.approve_selected(EVENT_ID, ids)
    removed = await service.remove_selected(EVENT_ID, ids)

    assert (approved.changed, approved.skipped) == (2, 1)
    assert (removed.changed, removed.skipped) == (3, 0)
    players.approve_selected.assert_awaited_once_with(EVENT_ID, ids)


@pytest.mark.parametrize("status", [EventStatus.ACTIVE, EventStatus.FINISHED])
async def test_selected_actions_require_draft_event(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock], status: EventStatus
) -> None:
    service, players, _, events = repositories
    events.get.return_value = {"status": status}
    with pytest.raises(ConflictError):
        await service.approve_selected(EVENT_ID, [PLAYER_ID])
    with pytest.raises(ConflictError):
        await service.remove_selected(EVENT_ID, [PLAYER_ID])
    players.approve_selected.assert_not_awaited()
    players.remove_selected.assert_not_awaited()


async def test_unassigned_group_with_team_filter_is_empty_without_query(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, teams, _ = repositories
    teams.get.return_value = {"_id": ObjectId()}
    players.counts.return_value = {"pending": 1, "unassigned": 2, "assigned": 3}
    result = await service.list(
        EVENT_ID, PlayerListQuery(group="unassigned", team_id=str(ObjectId()))
    )
    assert result.items == [] and result.total == 0
    assert result.counts.unassigned == 2
    players.page.assert_not_awaited()


async def test_list_exposes_the_discord_username(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.page.return_value = ([{**registration(), "discord_username": "crabby"}], 1)
    players.counts.return_value = {"pending": 1, "unassigned": 0, "assigned": 0}
    result = await service.list(EVENT_ID, PlayerListQuery())
    assert result.items[0].discord_username == "crabby"
