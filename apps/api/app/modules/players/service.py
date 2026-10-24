from builtins import list as builtin_list
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError
from app.modules.administration.repository import AdministrationRepository
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import NewRegistration, PlayerDocument, RosterDocument
from app.modules.players.repository import CaptainTakenError, PlayerRepository
from app.modules.players.schemas import (
    BuyInStatus,
    JoinRequest,
    ParticipantRole,
    ParticipationUpdate,
    PlayerCounts,
    PlayerListQuery,
    PlayerListResponse,
    PlayerResponse,
    PlayerUpdate,
    RegistrationStatus,
    RosterEntry,
    SelectionResult,
)
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.schemas import Activity
from app.modules.profiles.service import has_wom_stats
from app.modules.teams.repository import TeamRepository

READ_ONLY_EVENT_DETAIL = "Only draft events can be changed"
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
        await self._require_draft_event(event_id)
        if await self._players.get_for_user(event_id, user_id) is not None:
            raise ConflictError("Already registered in this event")
        registration = NewRegistration(
            display_name=await self._account_rsn(user_id, payload.account_id),
            account_id=payload.account_id,
            activity=payload.activity,
            teammate_ids=await self._teammates(user_id, payload.teammate_ids),
        )
        document = await self._players.create(event_id, registration, user_id)
        if document is None:
            raise ConflictError("Registration already exists in this event")
        return self._to_response(document)

    async def list(self, event_id: str, query: PlayerListQuery) -> PlayerListResponse:
        await self._require_event(event_id)
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
            items=[self._to_roster_entry(document) for document in documents],
            total=total,
            offset=query.offset,
            limit=query.limit,
            counts=counts,
        )

    async def approve_selected(
        self, event_id: str, player_ids: builtin_list[str]
    ) -> SelectionResult:
        await self._require_draft_event(event_id)
        changed = await self._players.approve_selected(event_id, player_ids)
        return SelectionResult(changed=changed, skipped=len(player_ids) - changed)

    async def remove_selected(
        self, event_id: str, player_ids: builtin_list[str]
    ) -> SelectionResult:
        await self._require_draft_event(event_id)
        changed = await self._players.remove_selected(event_id, player_ids)
        return SelectionResult(changed=changed, skipped=len(player_ids) - changed)

    async def update(self, event_id: str, player_id: str, payload: PlayerUpdate) -> PlayerResponse:
        await self._require_draft_event(event_id)
        if payload.team_id is not None:
            await self._require_team(event_id, payload.team_id)
        document = await self._players.update(event_id, player_id, payload)
        if document is None:
            await self._raise_transition_error(
                event_id, player_id, "Only approved registrations can be assigned"
            )
        assert document is not None
        return self._to_response(document)

    async def own_registration(self, event_id: str, user_id: str) -> PlayerResponse | None:
        await self._require_event(event_id)
        document = await self._players.get_for_user(event_id, user_id)
        return self._to_response(document) if document else None

    async def approve(self, event_id: str, player_id: str) -> PlayerResponse:
        await self._require_draft_event(event_id)
        document = await self._players.approve(event_id, player_id)
        if document is None:
            await self._raise_transition_error(
                event_id, player_id, "Only pending registrations can be approved"
            )
        assert document is not None
        return self._to_response(document)

    async def approve_all(self, event_id: str) -> int:
        await self._require_draft_event(event_id)
        return await self._players.approve_all(event_id)

    async def remove(self, event_id: str, player_id: str) -> PlayerResponse:
        await self._require_draft_event(event_id)
        document = await self._players.remove(event_id, player_id)
        if document is None:
            await self._raise_transition_error(
                event_id, player_id, "Registration is already removed"
            )
        assert document is not None
        return self._to_response(document)

    async def _raise_transition_error(self, event_id: str, player_id: str, detail: str) -> None:
        if await self._players.get(event_id, player_id) is None:
            raise NotFoundError("Player")
        raise ConflictError(detail)

    async def _require_event(self, event_id: str) -> None:
        if await self._events.get(event_id) is None:
            raise NotFoundError("Event")

    async def update_participation(
        self, event_id: str, player_id: str, payload: ParticipationUpdate
    ) -> PlayerResponse:
        """Role and buy-in of one participant (feature 023, BR-001-BR-004)."""
        await self._require_draft_event(event_id)
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
        return self._to_response(document)

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

    async def _require_draft_event(self, event_id: str) -> None:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)

    async def _require_team(self, event_id: str, team_id: str) -> None:
        if await self._teams.get(event_id, team_id) is None:
            raise NotFoundError("Team")

    @classmethod
    def _to_roster_entry(cls, document: RosterDocument) -> RosterEntry:
        role = document.get("role")
        accounts = document.get("account_count")
        admins = document.get("buy_in_admin") or []
        return RosterEntry(
            **cls._to_response(document).model_dump(),
            role=ParticipantRole(role) if role else None,
            boss_kc_total=document.get("boss_kc_total"),
            ehb_total=document.get("ehb_total"),
            alt_count=max(accounts - 1, 0) if accounts else None,
            timezone=document.get("timezone"),
            teammates=cls._teammate_names(document),
            buy_in_admin_name=str(admins[0]["username"]) if admins else None,
        )

    @staticmethod
    def _teammate_names(document: RosterDocument) -> builtin_list[str]:
        """Each wanted teammate's main RSN, or their Discord name without one."""
        users = {user["_id"]: user for user in document.get("mate_users") or []}
        mains = {
            profile["_id"]: next(
                (acc["rsn"] for acc in profile.get("accounts", []) if acc.get("is_main")),  # type: ignore[attr-defined]
                None,
            )
            for profile in document.get("mate_profiles") or []
        }
        names = []
        for mate_id in document.get("teammate_ids") or []:
            name = mains.get(mate_id) or users.get(mate_id, {}).get("username")
            if name:
                names.append(str(name))
        return names

    @staticmethod
    def _activity(document: PlayerDocument) -> Activity | None:
        activity = document.get("activity")
        return Activity(activity) if activity else None

    @staticmethod
    def _buy_in_status(document: PlayerDocument) -> BuyInStatus | None:
        buy_in = document.get("buy_in")
        return BuyInStatus(buy_in["status"]) if buy_in else None

    @staticmethod
    def _to_response(document: PlayerDocument) -> PlayerResponse:
        return PlayerResponse(
            id=str(document["_id"]),
            status=RegistrationStatus(document.get("status", RegistrationStatus.APPROVED)),
            event_id=str(document["event_id"]),
            team_id=str(document["team_id"]) if document["team_id"] is not None else None,
            display_name=document["display_name"],
            discord_username=document.get("discord_username"),
            account_id=document.get("account_id"),
            activity=PlayerService._activity(document),
            buy_in_status=PlayerService._buy_in_status(document),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
