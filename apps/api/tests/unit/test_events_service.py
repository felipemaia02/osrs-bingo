from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventCreate, EventStatus, EventUpdate
from app.modules.events.service import EventService

NOW = datetime(2026, 8, 30, 12, tzinfo=UTC)


def event_document(status: EventStatus = EventStatus.DRAFT) -> EventDocument:
    return {
        "_id": ObjectId("66d000000000000000000001"),
        "name": "Summer Bingo",
        "description": None,
        "start_at": NOW,
        "end_at": NOW + timedelta(days=7),
        "status": status,
        "created_at": NOW,
        "updated_at": NOW,
    }


def event_payload() -> EventCreate:
    return EventCreate(name=" Summer Bingo ", start_at=NOW, end_at=NOW + timedelta(days=7))


@pytest.fixture
def repository() -> AsyncMock:
    return AsyncMock(spec=EventRepository)


@pytest.fixture
def service(repository: AsyncMock) -> EventService:
    return EventService(repository)


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
    repository: AsyncMock, service: EventService
) -> None:
    draft = event_document()
    draft["status"] = "draft"  # MongoDB returns the persisted enum as a string.
    activated = event_document(EventStatus.ACTIVE)
    repository.get.return_value = draft
    repository.activate.return_value = (activated, False)

    result = await service.activate("event-id")

    assert result.status is EventStatus.ACTIVE
    repository.activate.assert_awaited_once_with("event-id")


async def test_activation_reports_active_limit(
    repository: AsyncMock, service: EventService
) -> None:
    repository.get.return_value = event_document()
    repository.activate.return_value = (None, True)

    with pytest.raises(ConflictError, match="Active event limit"):
        await service.activate("event-id")


async def test_finish_requires_active_status(repository: AsyncMock, service: EventService) -> None:
    repository.get.return_value = event_document(EventStatus.DRAFT)

    with pytest.raises(ConflictError, match="does not allow"):
        await service.finish("event-id")


async def test_finish_returns_finished_event(repository: AsyncMock, service: EventService) -> None:
    repository.get.return_value = event_document(EventStatus.ACTIVE)
    repository.finish.return_value = event_document(EventStatus.FINISHED)

    finished = await service.finish("event-id")

    assert finished.status is EventStatus.FINISHED
