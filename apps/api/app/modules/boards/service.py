from typing import Any

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.models import BoardDocument
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import (
    DEFAULT_BOARD_SIZE,
    BoardCardSnapshot,
    BoardPositionResponse,
    BoardResponse,
    BoardSave,
)
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import CardRevisionResponse, CardStatus

BOARD_CHANGED_DETAIL = "Board changed while you were editing"
BOARD_REQUIRED_DETAIL = "A complete valid board is required"


class BoardService:
    def __init__(
        self,
        boards: BoardRepository,
        cards: CardRepository,
        events: EventRepository,
    ) -> None:
        self._boards = boards
        self._cards = cards
        self._events = events

    async def save(self, event_id: str, payload: BoardSave, actor: CurrentUser) -> BoardResponse:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError("Only draft event boards can be changed")
        pinned = self._pinned_selections(await self._boards.get_by_event(event_id))
        positions: list[BoardPositionResponse] = []
        for selected in sorted(payload.positions, key=lambda item: item.position):
            card = await self._cards.get(selected.card_id)
            if card is None:
                raise NotFoundError("Card")
            already_pinned = (selected.card_id, selected.card_revision) in pinned
            if card["status"] != CardStatus.ACTIVE and not already_pinned:
                raise ConflictError("Retired cards cannot be selected")
            revision_data = next(
                (item for item in card["revisions"] if item["revision"] == selected.card_revision),
                None,
            )
            if revision_data is None:
                raise ConflictError("Selected card revision is unavailable")
            revision = CardRevisionResponse.model_validate(revision_data)
            snapshot = BoardCardSnapshot(
                card_id=str(card["_id"]),
                slug=card["slug"],
                card_revision=revision.revision,
                **revision.model_dump(
                    exclude={"revision", "change_reason", "created_by", "created_at"}
                ),
            )
            positions.append(
                BoardPositionResponse(
                    position=selected.position,
                    row=(selected.position - 1) // payload.size + 1,
                    column=(selected.position - 1) % payload.size + 1,
                    card=snapshot,
                )
            )
        document = await self._boards.save_draft(
            event_id, positions, payload.expected_revision, actor.id, size=payload.size
        )
        if document is None:
            raise ConflictError(BOARD_CHANGED_DETAIL)
        return self._response(document)

    async def get_admin(self, event_id: str) -> BoardResponse:
        if await self._events.get(event_id) is None:
            raise NotFoundError("Event")
        return self._response(await self._require_board(event_id))

    async def get_public(self, event_id: str) -> BoardResponse:
        event = await self._events.get(event_id)
        if event is None or event["status"] == EventStatus.DRAFT:
            raise NotFoundError("Board")
        board = await self._require_board(event_id)
        if not is_publishable_board(board):
            raise NotFoundError("Board")
        return self._response(board)

    @staticmethod
    def _pinned_selections(board: BoardDocument | None) -> set[tuple[str, int]]:
        """Card revisions already on the saved draft; retiring a card must not evict them."""
        if board is None:
            return set()
        return {
            (position["card"]["card_id"], position["card"]["card_revision"])
            for position in board.get("positions", [])
        }

    async def _require_board(self, event_id: str) -> BoardDocument:
        document = await self._boards.get_by_event(event_id)
        if document is None:
            raise NotFoundError("Board")
        return document

    @staticmethod
    def _response(document: BoardDocument) -> BoardResponse:
        positions = [BoardPositionResponse.model_validate(item) for item in document["positions"]]
        return BoardResponse(
            event_id=str(document["event_id"]),
            status=document["status"],
            revision=document["revision"],
            size=board_size(document),
            complete=is_publishable_board(document),
            positions=positions,
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            published_at=document.get("published_at"),
        )


def board_size(document: BoardDocument | dict[str, Any]) -> int:
    """Boards saved before sizes existed are 6x6."""
    return int(document.get("size", DEFAULT_BOARD_SIZE))


def is_publishable_board(document: BoardDocument | dict[str, Any] | None) -> bool:
    if document is None:
        return False
    total = board_size(document) ** 2
    positions = document.get("positions", [])
    if len(positions) != total:
        return False
    position_numbers = {position.get("position") for position in positions}
    card_ids = {position.get("card", {}).get("card_id") for position in positions}
    if position_numbers != set(range(1, total + 1)) or len(card_ids) != total or None in card_ids:
        return False
    return all(
        position.get("card", {}).get("wiki_image") is not None
        or position.get("card", {}).get("fallback_image_accepted") is True
        for position in positions
    )
