from app.core.config import Settings
from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.repository import PlayerRepository
from app.modules.teams.models import TeamDocument
from app.modules.teams.repository import TeamRepository
from app.modules.teams.schemas import TeamCreate, TeamResponse, TeamUpdate

TEAM_CONFLICT_DETAIL = "Team name already exists in this event"
READ_ONLY_EVENT_DETAIL = "Only draft events can be changed"
TEAM_EMBLEMS_DISABLED_DETAIL = "Team emblems are disabled"


class TeamService:
    def __init__(
        self,
        teams: TeamRepository,
        players: PlayerRepository,
        events: EventRepository,
        settings: Settings,
    ) -> None:
        self._teams = teams
        self._players = players
        self._events = events
        self._settings = settings

    async def create(self, event_id: str, payload: TeamCreate) -> TeamResponse:
        await self._require_draft_event(event_id)
        self._require_emblems_enabled(payload.emblem_url)
        document = await self._teams.create(
            event_id, payload, include_emblem=self._settings.team_emblems_enabled
        )
        if document is None:
            raise ConflictError(TEAM_CONFLICT_DETAIL)
        return self._to_response(document, 0)

    async def list(self, event_id: str) -> list[TeamResponse]:
        await self._require_event(event_id)
        documents = await self._teams.list(event_id)
        counts = await self._players.count_by_team_ids([document["_id"] for document in documents])
        return [
            self._to_response(document, counts.get(document["_id"], 0)) for document in documents
        ]

    async def update(self, event_id: str, team_id: str, payload: TeamUpdate) -> TeamResponse:
        await self._require_draft_event(event_id)
        self._require_emblems_enabled(payload.emblem_url)
        document = await self._teams.update(
            event_id, team_id, payload, include_emblem=self._settings.team_emblems_enabled
        )
        if document is None:
            if await self._teams.get(event_id, team_id) is None:
                raise NotFoundError("Team")
            raise ConflictError(TEAM_CONFLICT_DETAIL)
        return self._to_response(document, 0)

    async def _require_event(self, event_id: str) -> None:
        if await self._events.get(event_id) is None:
            raise NotFoundError("Event")

    async def _require_draft_event(self, event_id: str) -> None:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)

    def _require_emblems_enabled(self, emblem_url: str | None) -> None:
        if emblem_url is not None and not self._settings.team_emblems_enabled:
            raise DomainValidationError(TEAM_EMBLEMS_DISABLED_DETAIL)

    @staticmethod
    def _to_response(document: TeamDocument, member_count: int) -> TeamResponse:
        return TeamResponse(
            id=str(document["_id"]),
            event_id=str(document["event_id"]),
            name=document["name"],
            color=document["color"],
            emblem_url=document.get("emblem_url"),
            member_count=member_count,
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
