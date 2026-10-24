from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError
from app.modules.administration.repository import AdministrationRepository
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import NewRegistration
from app.modules.players.repository import CaptainTakenError, PlayerRepository
from app.modules.players.schemas import (
    BuyInStatus,
    JoinRequest,
    ParticipationUpdate,
    PlayerListQuery,
    PlayerUpdate,
    RegistrationStatus,
)
from app.modules.players.service import PlayerService
from app.modules.profiles.repository import ProfileRepository
from app.modules.teams.repository import TeamRepository

EVENT_ID, USER_ID, PLAYER_ID, TEAM_ID = (str(ObjectId()) for _ in range(4))
MAIN_ID, GHOST_ID, FRIEND_ID = (str(ObjectId()) for _ in range(3))
PROFILE = {
    "_id": ObjectId(USER_ID),
    "accounts": [
        {
            "id": MAIN_ID,
            "rsn": "Thunder Crab",
            "is_main": True,
            "wom_status": "found",
            "boss_kc": 10,
        },
        {"id": GHOST_ID, "rsn": "Ghost", "is_main": False, "wom_status": "not_found"},
    ],
}


def join(account_id: str = MAIN_ID, teammates: list[str] | None = None) -> JoinRequest:
    return JoinRequest(
        account_id=account_id,
        activity="one_to_three_h",  # type: ignore[arg-type]
        teammate_ids=teammates or [],
        accept_rules=True,
        accept_drop_account=True,
        accept_team=True,
    )


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
        "account_id": MAIN_ID,
        "activity": "one_to_three_h",
        "buy_in": {"status": "pending", "admin_id": None, "updated_at": now},
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
    profiles = AsyncMock(spec=ProfileRepository)
    profiles.get.return_value = PROFILE
    profiles.existing_user_ids.side_effect = lambda ids: set(ids) & {FRIEND_ID}
    administration = AsyncMock(spec=AdministrationRepository)
    service = PlayerService(players, teams, events, profiles, administration)
    return service, players, teams, events


async def test_registration_starts_pending_without_team(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, teams, _ = repositories
    result = await service.create(EVENT_ID, join(teammates=[FRIEND_ID]), USER_ID)
    assert result.status == RegistrationStatus.PENDING
    assert result.team_id is None
    assert result.account_id == MAIN_ID and result.buy_in_status == BuyInStatus.PENDING
    players.create.assert_awaited_once_with(
        EVENT_ID,
        NewRegistration("Thunder Crab", MAIN_ID, "one_to_three_h", [FRIEND_ID]),
        USER_ID,
    )
    teams.get.assert_not_awaited()


@pytest.mark.parametrize("status", [EventStatus.ACTIVE, EventStatus.FINISHED])
async def test_mutations_require_draft_event(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock], status: EventStatus
) -> None:
    service, players, _, events = repositories
    events.get.return_value = {"status": status}
    operations = [
        service.create(EVENT_ID, join(), USER_ID),
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
        await service.create(EVENT_ID, join(), USER_ID)
    players.create.assert_not_awaited()


async def test_duplicate_user_or_name_returns_conflict(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players, _, _ = repositories
    players.get_for_user.return_value = registration()
    with pytest.raises(ConflictError, match="Already registered"):
        await service.create(EVENT_ID, join(), USER_ID)
    players.create.assert_not_awaited()
    players.get_for_user.return_value = None
    players.create.return_value = None
    with pytest.raises(ConflictError, match="Registration already exists"):
        await service.create(EVENT_ID, join(), USER_ID)


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


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (lambda: join(account_id=str(ObjectId())), "Choose an account"),
        (lambda: join(account_id=GHOST_ID), "Wise Old Man"),
        (lambda: join(teammates=[USER_ID]), "yourself"),
        (lambda: join(teammates=[str(ObjectId())]), "teammate not found"),
    ],
)
async def test_join_requires_own_wom_account_and_real_teammates(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
    payload: object,
    message: str,
) -> None:
    service, players, _, _ = repositories
    with pytest.raises(DomainValidationError, match=message):
        await service.create(EVENT_ID, payload(), USER_ID)  # type: ignore[operator]
    players.create.assert_not_awaited()


def test_join_request_requires_agreements_and_at_most_three_teammates() -> None:
    base = join().model_dump()
    with pytest.raises(ValidationError):
        JoinRequest.model_validate({**base, "accept_team": False})
    with pytest.raises(ValidationError):
        JoinRequest.model_validate({**base, "teammate_ids": [str(ObjectId()) for _ in range(4)]})
    with pytest.raises(ValidationError, match="only once"):
        JoinRequest.model_validate({**base, "teammate_ids": [FRIEND_ID, FRIEND_ID]})
    with pytest.raises(ValidationError, match="Extra inputs"):
        JoinRequest.model_validate({**base, "team_id": TEAM_ID})


ADMIN_ID = ObjectId()


def participation(role: str | None, status: str = "pending", admin: str | None = None):  # type: ignore[no-untyped-def]
    return ParticipationUpdate(role=role, buy_in_status=status, buy_in_admin_id=admin)  # type: ignore[arg-type]


@pytest.fixture
def participants(
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> tuple[PlayerService, AsyncMock]:
    service, players, _, _ = repositories
    service._administration.administrators.return_value = [{"_id": ADMIN_ID}]  # type: ignore[attr-defined]
    players.get.return_value = {
        **registration(RegistrationStatus.APPROVED),
        "team_id": ObjectId(TEAM_ID),
    }
    players.set_participation.return_value = registration(RegistrationStatus.APPROVED)
    return service, players


async def test_captain_needs_approval_and_a_team_and_is_unique(
    participants: tuple[PlayerService, AsyncMock],
) -> None:
    service, players = participants
    await service.update_participation(EVENT_ID, PLAYER_ID, participation("captain"))
    assert players.set_participation.await_args.kwargs["team_id"] == ObjectId(TEAM_ID)

    players.set_participation.side_effect = CaptainTakenError
    with pytest.raises(ConflictError, match="already has a captain"):
        await service.update_participation(EVENT_ID, PLAYER_ID, participation("captain"))

    players.get.return_value = registration(RegistrationStatus.APPROVED)
    with pytest.raises(ConflictError, match="Assign a team"):
        await service.update_participation(EVENT_ID, PLAYER_ID, participation("captain"))
    players.get.return_value = registration(RegistrationStatus.PENDING)
    with pytest.raises(ConflictError, match="Only approved"):
        await service.update_participation(EVENT_ID, PLAYER_ID, participation("instructor"))


async def test_paid_buy_in_records_a_current_administrator(
    participants: tuple[PlayerService, AsyncMock],
) -> None:
    service, players = participants
    await service.update_participation(
        EVENT_ID, PLAYER_ID, participation(None, "paid", str(ADMIN_ID))
    )
    buy_in = players.set_participation.await_args.kwargs["buy_in"]
    assert buy_in["status"] == "paid" and buy_in["admin_id"] == ADMIN_ID

    with pytest.raises(DomainValidationError, match="current administrator"):
        await service.update_participation(
            EVENT_ID, PLAYER_ID, participation(None, "paid", str(ObjectId()))
        )


async def test_unchanged_buy_in_is_not_rewritten(
    participants: tuple[PlayerService, AsyncMock],
) -> None:
    service, players = participants
    await service.update_participation(EVENT_ID, PLAYER_ID, participation("instructor"))
    assert players.set_participation.await_args.kwargs["buy_in"] is None


async def test_participation_requires_a_draft_event_and_a_consistent_buy_in(
    participants: tuple[PlayerService, AsyncMock],
    repositories: tuple[PlayerService, AsyncMock, AsyncMock, AsyncMock],
) -> None:
    service, players = participants
    repositories[3].get.return_value = {"status": EventStatus.ACTIVE}
    with pytest.raises(ConflictError, match="Only draft"):
        await service.update_participation(EVENT_ID, PLAYER_ID, participation(None))
    players.set_participation.assert_not_awaited()
    with pytest.raises(ValidationError, match="who received"):
        participation(None, "paid")
    with pytest.raises(ValidationError, match="Only paid"):
        participation(None, "pending", str(ADMIN_ID))


def test_roster_entry_names_teammates_by_main_rsn_or_discord() -> None:
    mate, friend = ObjectId(), ObjectId()
    document = {
        **registration(RegistrationStatus.APPROVED),
        "role": "captain",
        "boss_kc_total": 17950,
        "ehb_total": 845.2,
        "account_count": 3,
        "timezone": "Europe/Berlin",
        "teammate_ids": [mate, friend],
        "mate_users": [{"_id": mate, "username": "iris.btw"}, {"_id": friend, "username": "mo"}],
        "mate_profiles": [{"_id": mate, "accounts": [{"rsn": "Ironman Iris", "is_main": True}]}],
        "buy_in_admin": [{"_id": ADMIN_ID, "username": "felps_"}],
    }

    entry = PlayerService._to_roster_entry(document)  # type: ignore[arg-type]

    assert entry.teammates == ["Ironman Iris", "mo"]
    assert entry.alt_count == 2 and entry.ehb_total == 845.2 and entry.role == "captain"
    assert entry.buy_in_admin_name == "felps_"
