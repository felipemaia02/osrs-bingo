from builtins import list as builtin_list
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError
from app.modules.administration.repository import AdministrationRepository
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import NewRegistration, PlayerDocument
from app.modules.players.repository import CaptainTakenError, PlayerRepository
from app.modules.players.roster import for_event, to_player_response, to_roster_entry
from app.modules.players.schemas import (
    JoinRequest,
    ParticipantRole,
    ParticipationUpdate,
    PlayerCounts,
    PlayerListQuery,
    PlayerListResponse,
    PlayerResponse,
    PlayerUpdate,
    RegistrationStatus,
    SelectionResult,
)
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.service import has_wom_stats
from app.modules.teams.repository import TeamRepository

READ_ONLY_EVENT_DETAIL = "Only draft events can be changed"
JOIN_CLOSED = "This event isn't taking new players"
TEAM_LOCKED = "Players already on a team can't be moved or removed during the event"
ACCOUNT_NOT_LINKED = "Choose an account from your profile"
ACCOUNT_NOT_ON_WOM = "This account isn't found on Wise Old Man"
TEAMMATE_IS_SELF = "You can't pick yourself as a teammate"
TEAMMATE_UNKNOWN = "Preferred teammate not found"
ROLE_NEEDS_APPROVAL = "Only approved players can have a role"
CAPTAIN_NEEDS_TEAM = "Assign a team before making this player captain"
CAPTAIN_TAKEN = "This team already has a captain"
BUY_IN_ADMIN_UNKNOWN = "Choose a current administrator"
PARTICIPANT_CHANGED = "This registration changed meanwhile. Reload and try again"


class PlayerService:
    def __init__(
        self,
        players: PlayerRepository,
        teams: TeamRepository,
        events: EventRepository,
        profiles: ProfileRepository,
        administration: AdministrationRepository,
    ) -> None:
        self._players = players
        self._teams = teams
        self._events = events
        self._profiles = profiles
        self._administration = administration

    async def create(self, event_id: str, payload: JoinRequest, user_id: str) -> PlayerResponse:
        event = await self._require_event(event_id)
        late = event["status"] == EventStatus.ACTIVE
        if not (event["status"] == EventStatus.DRAFT or (late and event.get("late_join"))):
            raise ConflictError(JOIN_CLOSED)
        if await self._players.get_for_user(event_id, user_id) is not None:
            raise ConflictError("Already registered in this event")
        registration = NewRegistration(
            display_name=await self._account_rsn(user_id, payload.account_id),
            account_id=payload.account_id,
            activity=payload.activity,
            teammate_ids=await self._teammates(user_id, payload.teammate_ids),
            joined_late=late,
        )
        document = await self._players.create(event_id, registration, user_id)
        if document is None:
            raise ConflictError("Registration already exists in this event")
        return to_player_response(document)

    async def list(self, event_id: str, query: PlayerListQuery) -> PlayerListResponse:
        event = await self._require_event(event_id)
        if query.team_id:
            await self._require_team(event_id, query.team_id)
        status = None
        assigned = None
        if query.group == "pending":
            status = RegistrationStatus.PENDING
        elif query.group in ("unassigned", "assigned"):
            status = RegistrationStatus.APPROVED
            assigned = query.group == "assigned"
        counts = PlayerCounts(**await self._players.counts(event_id))
        if query.group == "unassigned" and query.team_id:
            # A team filter can never match unassigned registrations.
            return PlayerListResponse(
                items=[], total=0, offset=query.offset, limit=query.limit, counts=counts
            )
        documents, total = await self._players.page(
            event_id,
            status=status,
            assigned=assigned,
            search=query.search,
            team_id=query.team_id,
            offset=query.offset,
            limit=query.limit,
        )
        return PlayerListResponse(
            items=[for_event(to_roster_entry(document), event) for document in documents],
            total=total,
            offset=query.offset,
            limit=query.limit,
            counts=counts,
        )

    async def approve_selected(
        self, event_id: str, player_ids: builtin_list[str]
    ) -> SelectionResult:
        await self._require_open_event(event_id)
        changed = await self._players.approve_selected(event_id, player_ids)
        return SelectionResult(changed=changed, skipped=len(player_ids) - changed)

    async def assign_selected(
        self, event_id: str, player_ids: builtin_list[str], team_id: str
    ) -> SelectionResult:
        """Feature 038: one team for several players; players who changed meanwhile are
        skipped, players already in that team are left as they are."""
        live = await self._require_open_event(event_id)
        await self._require_team(event_id, team_id)
        changed, already = await self._players.assign_selected(
            event_id, player_ids, team_id, only_without_team=live
        )
        return SelectionResult(changed=changed, skipped=len(player_ids) - changed - already)

    async def remove_selected(
        self, event_id: str, player_ids: builtin_list[str]
    ) -> SelectionResult:
        live = await self._require_open_event(event_id)
        changed = await self._players.remove_selected(event_id, player_ids, only_without_team=live)
        return SelectionResult(changed=changed, skipped=len(player_ids) - changed)

    async def update(self, event_id: str, player_id: str, payload: PlayerUpdate) -> PlayerResponse:
        live = await self._require_open_event(event_id)
        if live and payload.team_id is None:
            raise ConflictError(TEAM_LOCKED)
        if payload.team_id is not None:
            await self._require_team(event_id, payload.team_id)
        document = await self._players.update(event_id, player_id, payload, only_without_team=live)
        if document is None:
            await self._raise_transition_error(
                event_id,
                player_id,
                TEAM_LOCKED if live else "Only approved registrations can be assigned",
            )
        assert document is not None
        return to_player_response(document)

    async def own_registration(self, event_id: str, user_id: str) -> PlayerResponse | None:
        event = await self._require_event(event_id)
        document = await self._players.get_for_user(event_id, user_id)
        return for_event(to_player_response(document), event) if document else None

    async def approve(self, event_id: str, player_id: str) -> PlayerResponse:
        await self._require_open_event(event_id)
        document = await self._players.approve(event_id, player_id)
        if document is None:
            await self._raise_transition_error(
                event_id, player_id, "Only pending registrations can be approved"
            )
        assert document is not None
        return to_player_response(document)

    async def approve_all(self, event_id: str) -> int:
        await self._require_open_event(event_id)
        return await self._players.approve_all(event_id)

    async def remove(self, event_id: str, player_id: str) -> PlayerResponse:
        live = await self._require_open_event(event_id)
        document = await self._players.remove(event_id, player_id, only_without_team=live)
        if document is None:
            await self._raise_transition_error(
                event_id, player_id, TEAM_LOCKED if live else "Registration is already removed"
            )
        assert document is not None
        return to_player_response(document)

    async def _raise_transition_error(self, event_id: str, player_id: str, detail: str) -> None:
        if await self._players.get(event_id, player_id) is None:
            raise NotFoundError("Player")
        raise ConflictError(detail)

    async def _require_event(self, event_id: str) -> EventDocument:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        return event

    async def update_participation(
        self, event_id: str, player_id: str, payload: ParticipationUpdate
    ) -> PlayerResponse:
        """Role and buy-in of one participant (feature 023, BR-001-BR-004); also during the
        event, e.g. for late joiners (feature 037)."""
        await self._require_open_event(event_id)
        player = await self._players.get(event_id, player_id)
        if player is None:
            raise NotFoundError("Player")
        self._check_role(player, payload.role)
        buy_in = await self._buy_in_change(player, payload)
        try:
            document = await self._players.set_participation(
                event_id,
                player_id,
                role=payload.role,
                team_id=player["team_id"],
                buy_in=buy_in,
            )
        except CaptainTakenError as exc:
            raise ConflictError(CAPTAIN_TAKEN) from exc
        if document is None:
            raise ConflictError(PARTICIPANT_CHANGED)
        return to_player_response(document)

    @staticmethod
    def _check_role(player: PlayerDocument, role: ParticipantRole | None) -> None:
        if role is None:
            return
        if player.get("status") != RegistrationStatus.APPROVED:
            raise ConflictError(ROLE_NEEDS_APPROVAL)
        if role == ParticipantRole.CAPTAIN and player["team_id"] is None:
            raise ConflictError(CAPTAIN_NEEDS_TEAM)

    async def _buy_in_change(
        self, player: PlayerDocument, payload: ParticipationUpdate
    ) -> dict[str, Any] | None:
        """The new buy-in record, or None when status and admin stay the same."""
        admin_id = ObjectId(payload.buy_in_admin_id) if payload.buy_in_admin_id else None
        current = player.get("buy_in")
        if (
            current
            and current["status"] == payload.buy_in_status
            and current["admin_id"] == admin_id
        ):
            return None
        if admin_id is not None:
            administrators = await self._administration.administrators()
            if admin_id not in {user["_id"] for user in administrators}:
                raise DomainValidationError(BUY_IN_ADMIN_UNKNOWN)
        return {
            "status": payload.buy_in_status,
            "admin_id": admin_id,
            "updated_at": datetime.now(UTC),
        }

    async def _account_rsn(self, user_id: str, account_id: str) -> str:
        """The RSN of a profile account usable for bingo (has WOM stats), stored as a snapshot."""
        profile = await self._profiles.get(user_id)
        accounts = profile["accounts"] if profile else []
        account = next((item for item in accounts if item["id"] == account_id), None)
        if account is None:
            raise DomainValidationError(ACCOUNT_NOT_LINKED)
        if not has_wom_stats(account):
            raise DomainValidationError(ACCOUNT_NOT_ON_WOM)
        return account["rsn"]

    async def _teammates(self, user_id: str, teammate_ids: builtin_list[str]) -> builtin_list[str]:
        ids = [item.lower() for item in teammate_ids]
        if user_id.lower() in ids:
            raise DomainValidationError(TEAMMATE_IS_SELF)
        if ids and await self._profiles.existing_user_ids(ids) != set(ids):
            raise DomainValidationError(TEAMMATE_UNKNOWN)
        return ids

    async def _require_open_event(self, event_id: str) -> bool:
        """Draft events allow every change; active ones (feature 037) only changes to players
        still without a team, plus roles and buy-ins. Returns True while active."""
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] not in (EventStatus.DRAFT, EventStatus.ACTIVE):
            raise ConflictError(READ_ONLY_EVENT_DETAIL)
        return bool(event["status"] == EventStatus.ACTIVE)

    async def _require_team(self, event_id: str, team_id: str) -> None:
        if await self._teams.get(event_id, team_id) is None:
            raise NotFoundError("Team")
