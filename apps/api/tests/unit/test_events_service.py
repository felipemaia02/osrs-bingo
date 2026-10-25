from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.boards.repository import BoardRepository
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventCreate, EventRules, EventStatus, EventUpdate
from app.modules.events.service import EventService
from app.modules.players.repository import PlayerRepository

NOW = datetime(2026, 8, 30, 12, tzinfo=UTC)


def event_document(status: EventStatus = EventStatus.DRAFT) -> EventDocument:
    document: EventDocument = {
        "_id": ObjectId("66d000000000000000000001"),
        "name": "Summer Bingo",
        "description": None,
        "start_at": NOW,
        "end_at": NOW + timedelta(days=7),
        "status": status,
        "created_at": NOW,
        "updated_at": NOW,
    }
    return document


def event_payload() -> EventCreate:
    return EventCreate(name=" Summer Bingo ", start_at=NOW, end_at=NOW + timedelta(days=7))


@pytest.fixture
def repository() -> AsyncMock:
    return AsyncMock(spec=EventRepository)


@pytest.fixture
def boards() -> AsyncMock:
    repository = AsyncMock(spec=BoardRepository)
    repository.get_by_event.return_value = {
        "positions": [
            {
                "position": position,
                "card": {
                    "card_id": f"card-{position}",
                    "fallback_image_accepted": True,
                },
            }
            for position in range(1, 37)
        ],
        "row_bonus": 25,
        "column_bonus": 30,
    }
    return repository


@pytest.fixture
def players() -> AsyncMock:
    return AsyncMock(spec=PlayerRepository)


@pytest.fixture
def service(repository: AsyncMock, boards: AsyncMock, players: AsyncMock) -> EventService:
    return EventService(repository, boards, players)


async def test_create_normalizes_and_returns_draft(
    repository: AsyncMock, service: EventService
) -> None:
    repository.create.return_value = event_document()

    created = await service.create(event_payload())

    assert created.status is EventStatus.DRAFT
    assert created.name == "Summer Bingo"


async def test_missing_event_returns_not_found(
    repository: AsyncMock, service: EventService
) -> None:
    repository.get.return_value = None

    with pytest.raises(NotFoundError):
        await service.get("missing")


async def test_active_event_cannot_be_edited(repository: AsyncMock, service: EventService) -> None:
    repository.get.return_value = event_document(EventStatus.ACTIVE)

    with pytest.raises(ConflictError, match="Only draft"):
        await service.update("event-id", EventUpdate(**event_payload().model_dump()))

    repository.update_draft.assert_not_awaited()


async def test_activation_accepts_status_returned_as_string(
    repository: AsyncMock, boards: AsyncMock, service: EventService
) -> None:
    draft = event_document()
    draft["status"] = "draft"  # MongoDB returns the persisted enum as a string.
    activated = event_document(EventStatus.ACTIVE)
    repository.get.return_value = draft
    repository.activate.return_value = (activated, False)

    result = await service.activate("event-id")

    assert result.status is EventStatus.ACTIVE
    repository.activate.assert_awaited_once_with("event-id")
    boards.publish.assert_awaited_once_with("event-id", "system")


async def test_activation_reports_active_limit(
    repository: AsyncMock, service: EventService
) -> None:
    repository.get.return_value = event_document()
    repository.activate.return_value = (None, True)

    with pytest.raises(ConflictError, match="Active event limit"):
        await service.activate("event-id")


async def test_activation_requires_complete_board(
    repository: AsyncMock, boards: AsyncMock, service: EventService
) -> None:
    repository.get.return_value = event_document()
    boards.get_by_event.return_value = {"positions": []}

    with pytest.raises(ConflictError, match="complete valid board"):
        await service.activate("event-id")

    repository.activate.assert_not_awaited()


async def test_finish_requires_active_status(repository: AsyncMock, service: EventService) -> None:
    repository.get.return_value = event_document(EventStatus.DRAFT)

    with pytest.raises(ConflictError, match="does not allow"):
        await service.finish("event-id")


async def test_finish_returns_finished_event(repository: AsyncMock, service: EventService) -> None:
    repository.get.return_value = event_document(EventStatus.ACTIVE)
    repository.finish.return_value = event_document(EventStatus.FINISHED)

    finished = await service.finish("event-id")

    assert finished.status is EventStatus.FINISHED


async def test_activation_requires_the_board_line_bonuses(
    repository: AsyncMock, boards: AsyncMock, service: EventService
) -> None:
    repository.get.return_value = event_document()
    boards.get_by_event.return_value = {**boards.get_by_event.return_value, "column_bonus": None}

    with pytest.raises(ConflictError, match="bonuses on the board"):
        await service.activate("event-id")

    repository.activate.assert_not_awaited()


async def test_rules_are_editable_only_while_draft(
    repository: AsyncMock, service: EventService
) -> None:
    rules = EventRules(rules_text="  Drops only count during the event.\r\n\nBe nice.  ")
    repository.get.return_value = event_document()
    repository.update_rules.return_value = {**event_document(), "rules_text": rules.rules_text}

    result = await service.set_rules("event-id", rules)

    assert rules.rules_text == "Drops only count during the event.\n\nBe nice."
    assert result.rules_text == rules.rules_text
    repository.update_rules.assert_awaited_once_with("event-id", rules)

    repository.get.return_value = event_document(EventStatus.ACTIVE)
    with pytest.raises(ConflictError, match="Only draft"):
        await service.set_rules("event-id", rules)


def test_empty_rules_text_is_stored_as_none() -> None:
    assert EventRules(rules_text=" \n ").rules_text is None


async def test_buy_in_is_optional_text_returned_with_the_event(
    repository: AsyncMock, service: EventService
) -> None:
    payload = EventUpdate(
        name="Summer Bingo", start_at=NOW, end_at=NOW + timedelta(days=7), buy_in="  5M gp "
    )
    repository.get.return_value = event_document()
    repository.update_draft.return_value = {**event_document(), "buy_in": payload.buy_in}

    updated = await service.update("66d000000000000000000001", payload)

    assert payload.buy_in == "5M gp" and updated.buy_in == "5M gp"
    assert event_payload().buy_in is None
    assert (
        EventCreate(name="x", start_at=NOW, end_at=NOW + timedelta(days=1), buy_in=" ").buy_in
        is None
    )
    with pytest.raises(ValueError):
        EventCreate(name="x", start_at=NOW, end_at=NOW + timedelta(days=1), buy_in="g" * 81)


async def test_mine_lists_only_the_users_events(
    repository: AsyncMock, players: AsyncMock, service: EventService
) -> None:
    event_id = ObjectId("66d000000000000000000001")
    players.event_ids_for_user.return_value = [event_id]
    repository.list_by_ids.return_value = [event_document()]

    events = await service.mine(str(ObjectId()))

    assert [event.name for event in events] == ["Summer Bingo"]
    repository.list_by_ids.assert_awaited_once_with([event_id])

    players.event_ids_for_user.return_value = []
    assert await service.mine(str(ObjectId())) == []
