from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.models import BoardDocument
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import BoardSave, BoardStatus
from app.modules.boards.service import BoardService, is_publishable_board
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.tiles.models import CardDocument
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import CardStatus

NOW = datetime(2026, 10, 3, 18, tzinfo=UTC)
ADMIN = CurrentUser(id="admin-id", discord_id="123", username="Admin", is_admin=True)
EVENT_ID = "66d000000000000000000001"
CARD_ID = "66d000000000000000000010"


def event_document(status: EventStatus = EventStatus.DRAFT) -> dict[str, object]:
    return {
        "_id": ObjectId(EVENT_ID),
        "name": "Summer Bingo",
        "description": None,
        "start_at": NOW,
        "end_at": NOW + timedelta(days=7),
        "status": status,
        "created_at": NOW,
        "updated_at": NOW,
    }


def card_document() -> CardDocument:
    return {
        "_id": ObjectId(CARD_ID),
        "slug": "vorkath",
        "status": CardStatus.ACTIVE,
        "current_revision": 1,
        "revisions": [
            {
                "revision": 1,
                "name": "Vorkath",
                "description": None,
                "kind": "boss",
                "difficulty": "High",
                "tile_score": 13,
                "completion_requirement": 8,
                "drops": [
                    {
                        "key": "skeletal-visage",
                        "name": "Skeletal Visage",
                        "progress_weight": 2,
                        "aliases": [],
                        "verification_note": None,
                        "counting_restriction": None,
                    }
                ],
                "wiki_image": None,
                "fallback_image_accepted": True,
                "rule_note": None,
                "provenance": {
                    "source": "admin",
                    "source_ref": None,
                    "source_cells": [],
                    "derived_from_revision": None,
                },
                "change_reason": "Initial",
                "created_by": ADMIN.id,
                "created_at": NOW,
            }
        ],
        "created_at": NOW,
        "updated_at": NOW,
    }


def saved_board(positions: list[dict[str, object]]) -> BoardDocument:
    return {
        "_id": ObjectId("66d000000000000000000099"),
        "event_id": ObjectId(EVENT_ID),
        "status": BoardStatus.DRAFT,
        "revision": 1,
        "positions": positions,
        "created_by": ADMIN.id,
        "updated_by": ADMIN.id,
        "created_at": NOW,
        "updated_at": NOW,
    }


@pytest.fixture
def repositories() -> tuple[AsyncMock, AsyncMock, AsyncMock]:
    boards = AsyncMock(spec=BoardRepository)
    cards = AsyncMock(spec=CardRepository)
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = event_document()
    cards.get.return_value = card_document()
    return boards, cards, events


async def test_save_pins_exact_card_revision_values(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    service = BoardService(boards, cards, events)
    payload = BoardSave(
        expected_revision=0,
        positions=[{"position": 1, "card_id": CARD_ID, "card_revision": 1}],
    )

    async def save(
        event_id: str, positions: list[object], expected_revision: int, actor_id: str
    ) -> BoardDocument:
        serialized = [position.model_dump(mode="python") for position in positions]
        return saved_board(serialized)

    boards.save_draft.side_effect = save

    result = await service.save(EVENT_ID, payload, ADMIN)

    assert result.positions[0].card.tile_score == 13
    assert result.positions[0].card.difficulty.value == "High"
    assert result.positions[0].card.card_revision == 1
    assert result.positions[0].row == 1
    assert result.positions[0].column == 1


async def test_stale_board_save_is_rejected(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    boards.save_draft.return_value = None
    service = BoardService(boards, cards, events)
    payload = BoardSave(
        expected_revision=3,
        positions=[{"position": 1, "card_id": CARD_ID, "card_revision": 1}],
    )

    with pytest.raises(ConflictError, match="changed"):
        await service.save(EVENT_ID, payload, ADMIN)


async def test_public_board_hides_draft_event(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    events.get.return_value = event_document(EventStatus.DRAFT)

    with pytest.raises(NotFoundError):
        await BoardService(boards, cards, events).get_public(EVENT_ID)

    boards.get_by_event.assert_not_awaited()


def test_publishable_board_requires_every_unique_position_and_card() -> None:
    positions = [
        {
            "position": position,
            "card": {
                "card_id": f"card-{position}",
                "fallback_image_accepted": True,
            },
        }
        for position in range(1, 37)
    ]

    assert is_publishable_board({"positions": positions}) is True
    positions[-1]["card"] = positions[0]["card"]
    assert is_publishable_board({"positions": positions}) is False

