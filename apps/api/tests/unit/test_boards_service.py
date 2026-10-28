from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.models import BoardDocument
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import BoardPositionUpdate, BoardSave, BoardStatus
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
    boards.get_by_event.return_value = None
    return boards, cards, events


def retired_card_document() -> CardDocument:
    card = card_document()
    card["status"] = CardStatus.RETIRED
    return card


async def test_retired_card_cannot_be_newly_selected(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    cards.get.return_value = retired_card_document()
    service = BoardService(boards, cards, events)
    payload = BoardSave(
        expected_revision=0,
        positions=[{"position": 1, "card_id": CARD_ID, "card_revision": 1}],
    )

    with pytest.raises(ConflictError):
        await service.save(EVENT_ID, payload, ADMIN)
    boards.save_draft.assert_not_called()


async def test_retired_card_already_on_draft_board_can_be_saved_again(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    cards.get.return_value = retired_card_document()
    boards.get_by_event.return_value = saved_board(
        [
            {
                "position": 1,
                "row": 1,
                "column": 1,
                "card": {"card_id": CARD_ID, "card_revision": 1},
            }
        ]
    )
    boards.save_draft.side_effect = lambda event_id, positions, revision, actor, **_: saved_board(
        [position.model_dump(mode="python") for position in positions]
    )
    service = BoardService(boards, cards, events)
    payload = BoardSave(
        expected_revision=1,
        positions=[{"position": 7, "card_id": CARD_ID, "card_revision": 1}],
    )

    result = await service.save(EVENT_ID, payload, ADMIN)

    assert result.positions[0].position == 7
    assert result.positions[0].card.card_revision == 1


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
        event_id: str,
        positions: list[object],
        expected_revision: int,
        actor_id: str,
        **_: object,
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


def full_board(size: int, filled: int | None = None) -> dict[str, object]:
    count = size**2 if filled is None else filled
    return {
        "size": size,
        "positions": [
            {
                "position": position,
                "card": {"card_id": f"card-{position}", "fallback_image_accepted": True},
            }
            for position in range(1, count + 1)
        ],
    }


async def test_save_computes_row_and_column_from_board_size(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    boards.save_draft.side_effect = lambda event_id, positions, revision, actor, **_: {
        **saved_board([position.model_dump(mode="python") for position in positions]),
        "size": _["size"],
    }
    payload = BoardSave(
        expected_revision=0,
        size=4,
        positions=[{"position": 6, "card_id": CARD_ID, "card_revision": 1}],
    )

    result = await BoardService(boards, cards, events).save(EVENT_ID, payload, ADMIN)

    assert result.size == 4
    assert (result.positions[0].row, result.positions[0].column) == (2, 2)
    assert boards.save_draft.await_args.kwargs["size"] == 4


@pytest.mark.parametrize("size", [2, 7])
def test_board_size_must_be_between_three_and_six(size: int) -> None:
    with pytest.raises(ValidationError):
        BoardSave(expected_revision=0, size=size, positions=[])


def test_board_positions_must_fit_the_board_size() -> None:
    with pytest.raises(ValidationError, match="fit the board size"):
        BoardSave(
            expected_revision=0,
            size=4,
            positions=[{"position": 17, "card_id": CARD_ID, "card_revision": 1}],
        )


def test_publishable_board_requires_every_position_of_its_size() -> None:
    assert is_publishable_board(full_board(5, filled=24)) is False
    assert is_publishable_board(full_board(5)) is True
    assert is_publishable_board(full_board(3)) is True


def test_board_without_size_is_six_by_six() -> None:
    legacy = full_board(6)
    del legacy["size"]

    assert is_publishable_board(legacy) is True
    assert BoardService._response(saved_board([])).size == 6


async def test_save_stores_the_line_bonuses(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    boards.save_draft.side_effect = lambda event_id, positions, revision, actor, **settings: {
        **saved_board([position.model_dump(mode="python") for position in positions]),
        **settings,
    }
    payload = BoardSave(expected_revision=0, row_bonus=25, column_bonus=0, positions=[])

    result = await BoardService(boards, cards, events).save(EVENT_ID, payload, ADMIN)

    assert (result.row_bonus, result.column_bonus) == (25, 0)
    assert boards.save_draft.await_args.kwargs["row_bonus"] == 25


def test_line_bonuses_are_bounded() -> None:
    with pytest.raises(ValidationError):
        BoardSave(expected_revision=0, row_bonus=1001, positions=[])


def test_bonus_row_positions_follow_the_grid() -> None:
    from app.modules.boards.service import grid_place

    assert grid_place(9, 3) == (3, 3, False)
    assert grid_place(10, 3) == (4, 1, True)
    assert grid_place(12, 3) == (4, 3, True)


def test_bonus_row_is_bounded_by_the_board_size() -> None:
    with pytest.raises(ValidationError, match="longer than the board size"):
        BoardSave(expected_revision=0, size=3, bonus_slots=4, positions=[])
    with pytest.raises(ValidationError, match="fit the board size"):
        BoardSave(
            expected_revision=0,
            size=3,
            bonus_slots=2,
            positions=[{"position": 12, "card_id": CARD_ID, "card_revision": 1}],
        )


def test_publishable_board_needs_every_created_bonus_slot() -> None:
    board = full_board(3)
    board["bonus_slots"] = 2
    assert is_publishable_board(board) is False
    board["positions"] = [
        *board["positions"],  # type: ignore[list-item]
        *(
            {
                "position": position,
                "card": {"card_id": f"bonus-{position}", "fallback_image_accepted": True},
            }
            for position in (10, 11)
        ),
    ]
    assert is_publishable_board(board) is True


def live_board(card_revision: int = 1) -> BoardDocument:
    """Published 1-square board whose square shows Vorkath revision `card_revision` (036)."""
    snapshot = {
        "card_id": CARD_ID,
        "slug": "vorkath",
        "card_revision": card_revision,
        **{
            key: value
            for key, value in card_document()["revisions"][0].items()
            if key not in {"revision", "change_reason", "created_by", "created_at"}
        },
    }
    board = saved_board([{"position": 1, "row": 1, "column": 1, "card": snapshot}])
    board["status"] = BoardStatus.PUBLISHED
    return board


def card_with_revision_two() -> CardDocument:
    card = card_document()
    second = {**card["revisions"][0], "revision": 2, "completion_requirement": 6}
    card["revisions"].append(second)
    card["current_revision"] = 2
    return card


async def test_a_live_square_moves_to_a_newer_revision_with_a_reason(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
) -> None:
    boards, cards, events = repositories
    events.get.return_value = event_document(EventStatus.ACTIVE)
    boards.get_by_event.return_value = live_board()
    cards.get.return_value = card_with_revision_two()
    updated = live_board(2)
    updated["positions"][0]["updates"] = [
        {
            "from_revision": 1,
            "to_revision": 2,
            "reason": "Requirement was too high",
            "updated_by_name": ADMIN.username,
            "updated_at": NOW,
        }
    ]
    boards.replace_card.return_value = updated

    response = await BoardService(boards, cards, events).update_position(
        EVENT_ID,
        1,
        BoardPositionUpdate(card_revision=2, reason="  Requirement  was too high "),
        ADMIN,
    )

    event_id, revision, position, snapshot, record = boards.replace_card.await_args.args
    assert (event_id, revision, position) == (EVENT_ID, 1, 1)
    assert snapshot["card_revision"] == 2 and snapshot["completion_requirement"] == 6
    assert record["reason"] == "Requirement was too high" and record["from_revision"] == 1
    assert record["updated_by"] == ADMIN.id
    assert response.positions[0].updates[0].reason == "Requirement was too high"


@pytest.mark.parametrize(
    ("event_status", "card_revision", "message"),
    [
        (EventStatus.DRAFT, 2, "active event"),
        (EventStatus.ACTIVE, 1, "newer revision"),
    ],
)
async def test_live_fixes_need_an_active_event_and_a_newer_revision(
    repositories: tuple[AsyncMock, AsyncMock, AsyncMock],
    event_status: EventStatus,
    card_revision: int,
    message: str,
) -> None:
    boards, cards, events = repositories
    events.get.return_value = event_document(event_status)
    boards.get_by_event.return_value = live_board()
    cards.get.return_value = card_with_revision_two()

    with pytest.raises(ConflictError, match=message):
        await BoardService(boards, cards, events).update_position(
            EVENT_ID, 1, BoardPositionUpdate(card_revision=card_revision, reason="fix"), ADMIN
        )
    boards.replace_card.assert_not_awaited()
