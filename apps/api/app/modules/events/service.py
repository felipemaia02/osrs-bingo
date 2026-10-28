from builtins import list as builtin_list
from datetime import UTC, datetime

from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger, log_event
from app.modules.boards.repository import BoardRepository
from app.modules.boards.service import BOARD_REQUIRED_DETAIL, is_publishable_board
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import (
    EventCreate,
    EventResponse,
    EventRules,
    EventStatus,
    EventUpdate,
    RulesAddendum,
    RulesAddendumCreate,
)
from app.modules.players.repository import PlayerRepository

ACTIVE_EVENT_LIMIT_DETAIL = "Active event limit reached"
INVALID_TRANSITION_DETAIL = "Event status does not allow this transition"
READ_ONLY_EVENT_DETAIL = "Only draft events can be edited"
ADDENDUM_ACTIVE_ONLY = "Clarifications can only be added while the event is active"
LINE_BONUSES_REQUIRED_DETAIL = "Set the row and column bonuses on the board before activating"


class EventService:
    def __init__(
        self, repository: EventRepository, boards: BoardRepository, players: PlayerRepository
    ) -> None:
        self._repository = repository
        self._boards = boards
        self._players = players

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

    async def mine(self, user_id: str) -> builtin_list[EventResponse]:
        """Events the user is in (pending or approved registration), newest first (026)."""
        event_ids = await self._players.event_ids_for_user(user_id)
        documents = await self._repository.list_by_ids(event_ids) if event_ids else []
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

    async def set_rules(self, event_id: str, rules: EventRules) -> EventResponse:
        event = await self._require_event(event_id)
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)
        updated = await self._repository.update_rules(event_id, rules)
        if updated is None:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)
        log_event(self._logger, 20, "event_rules_updated", event_id=event_id)
        return self._to_response(updated)

    async def add_rules_addendum(
        self, event_id: str, payload: RulesAddendumCreate, actor_id: str
    ) -> EventResponse:
        """Clarifications are added (never edited) while the event is active (feature 036)."""
        event = await self._require_event(event_id)
        if event["status"] != EventStatus.ACTIVE:
            raise ConflictError(ADDENDUM_ACTIVE_ONLY)
        updated = await self._repository.add_rules_addendum(
            event_id, {"text": payload.text, "added_at": datetime.now(UTC), "added_by": actor_id}
        )
        if updated is None:
            raise ConflictError(ADDENDUM_ACTIVE_ONLY)
        log_event(self._logger, 20, "event_rules_addendum_added", event_id=event_id)
        return self._to_response(updated)

    async def activate(self, event_id: str, actor_id: str = "system") -> EventResponse:
        event = await self._require_event(event_id)
        self._require_status(event, EventStatus.DRAFT)
        board = await self._boards.get_by_event(event_id)
        if not is_publishable_board(board):
            raise ConflictError(BOARD_REQUIRED_DETAIL)
        if board is None or board.get("row_bonus") is None or board.get("column_bonus") is None:
            raise ConflictError(LINE_BONUSES_REQUIRED_DETAIL)
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
            rules_text=document.get("rules_text"),
            rules_addenda=[
                RulesAddendum(text=item["text"], added_at=item["added_at"])
                for item in document.get("rules_addenda") or []
            ],
            buy_in=document.get("buy_in"),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
