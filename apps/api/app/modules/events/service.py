from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger, log_event
from app.modules.boards.repository import BoardRepository
from app.modules.boards.service import BOARD_REQUIRED_DETAIL, is_publishable_board
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventCreate, EventResponse, EventStatus, EventUpdate

ACTIVE_EVENT_LIMIT_DETAIL = "Active event limit reached"
INVALID_TRANSITION_DETAIL = "Event status does not allow this transition"
READ_ONLY_EVENT_DETAIL = "Only draft events can be edited"


class EventService:
    def __init__(self, repository: EventRepository, boards: BoardRepository) -> None:
        self._repository = repository
        self._boards = boards

    _logger = get_logger(__name__)

    async def create(self, payload: EventCreate) -> EventResponse:
        result = self._to_response(await self._repository.create(payload))
        log_event(self._logger, 20, "event_created", event_id=result.id)
        return result

    async def get(self, event_id: str) -> EventResponse:
        log_event(self._logger, 20, "event_read_requested", event_id=event_id)
        return self._to_response(await self._require_event(event_id))

    async def list(self, status: EventStatus | None = None) -> list[EventResponse]:
        documents = await self._repository.list(status)
        log_event(
            self._logger,
            20,
            "events_listed",
            status=status.value if status else "all",
            count=len(documents),
        )
        return [self._to_response(document) for document in documents]

    async def update(self, event_id: str, payload: EventUpdate) -> EventResponse:
        event = await self._require_event(event_id)
        if event["status"] != EventStatus.DRAFT:
            log_event(
                self._logger, 30, "event_update_rejected", event_id=event_id, reason="read_only"
            )
            raise ConflictError(READ_ONLY_EVENT_DETAIL)
        updated = await self._repository.update_draft(event_id, payload)
        if updated is None:
            log_event(
                self._logger, 30, "event_update_rejected", event_id=event_id, reason="not_updated"
            )
            raise ConflictError(READ_ONLY_EVENT_DETAIL)
        log_event(self._logger, 20, "event_updated", event_id=event_id)
        return self._to_response(updated)

    async def activate(self, event_id: str, actor_id: str = "system") -> EventResponse:
        event = await self._require_event(event_id)
        self._require_status(event, EventStatus.DRAFT)
        board = await self._boards.get_by_event(event_id)
        if not is_publishable_board(board):
            raise ConflictError(BOARD_REQUIRED_DETAIL)
        activated, limit_reached = await self._repository.activate(event_id)
        if activated is not None:
            await self._boards.publish(event_id, actor_id)
            log_event(self._logger, 20, "event_activated", event_id=event_id)
            return self._to_response(activated)
        if limit_reached:
            log_event(
                self._logger,
                30,
                "event_activation_rejected",
                event_id=event_id,
                reason="active_limit",
            )
            raise ConflictError(ACTIVE_EVENT_LIMIT_DETAIL)
        raise ConflictError(INVALID_TRANSITION_DETAIL)

    async def finish(self, event_id: str) -> EventResponse:
        event = await self._require_event(event_id)
        self._require_status(event, EventStatus.ACTIVE)
        finished = await self._repository.finish(event_id)
        if finished is None:
            raise ConflictError(INVALID_TRANSITION_DETAIL)
        log_event(self._logger, 20, "event_finished", event_id=event_id)
        return self._to_response(finished)

    async def _require_event(self, event_id: str) -> EventDocument:
        event = await self._repository.get(event_id)
        if event is None:
            log_event(self._logger, 30, "event_not_found", event_id=event_id)
            raise NotFoundError("Event")
        return event

    def _require_status(self, event: EventDocument, expected: EventStatus) -> None:
        if event["status"] != expected:
            log_event(
                self._logger,
                30,
                "event_transition_rejected",
                event_id=str(event["_id"]),
                expected=expected.value,
                actual=event["status"],
            )
            raise ConflictError(INVALID_TRANSITION_DETAIL)

    @staticmethod
    def _to_response(document: EventDocument) -> EventResponse:
        return EventResponse(
            id=str(document["_id"]),
            name=document["name"],
            description=document["description"],
            start_at=document["start_at"],
            end_at=document["end_at"],
            status=document["status"],
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
