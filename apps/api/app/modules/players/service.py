from app.core.exceptions import ConflictError, NotFoundError
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import PlayerDocument
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import (
    PlayerCreate,
    PlayerResponse,
    PlayerUpdate,
    RegistrationStatus,
)
from app.modules.teams.repository import TeamRepository

READ_ONLY_EVENT_DETAIL = "Only draft events can be changed"


class PlayerService:
    def __init__(
        self, players: PlayerRepository, teams: TeamRepository, events: EventRepository
    ) -> None:
        self._players = players
        self._teams = teams
        self._events = events

    async def create(self, event_id: str, payload: PlayerCreate, user_id: str) -> PlayerResponse:
        await self._require_draft_event(event_id)
        if await self._players.get_for_user(event_id, user_id) is not None:
            raise ConflictError("Already registered in this event")
        document = await self._players.create(event_id, payload, user_id)
        if document is None:
            raise ConflictError("Registration already exists in this event")
        return self._to_response(document)

    async def list(self, event_id: str) -> list[PlayerResponse]:
        await self._require_event(event_id)
        return [self._to_response(document) for document in await self._players.list(event_id)]

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

    async def _require_draft_event(self, event_id: str) -> None:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)

    async def _require_team(self, event_id: str, team_id: str) -> None:
        if await self._teams.get(event_id, team_id) is None:
            raise NotFoundError("Team")

    @staticmethod
    def _to_response(document: PlayerDocument) -> PlayerResponse:
        return PlayerResponse(
            id=str(document["_id"]),
            status=RegistrationStatus(document.get("status", RegistrationStatus.APPROVED)),
            event_id=str(document["event_id"]),
            team_id=str(document["team_id"]) if document["team_id"] is not None else None,
            display_name=document["display_name"],
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
