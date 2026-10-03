import asyncio
from unittest.mock import AsyncMock, MagicMock

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.database.indexes import IndexManager
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from tests.unit.test_events_service import event_document


def test_active_index_guards_status_including_legacy_slots() -> None:
    _, keys, options = next(
        item
        for item in IndexManager._definitions
        if item[2].get("name") == "events_single_active_unique"
    )
    assert keys == [("status", 1)]
    assert options["unique"] is True
    assert options["partialFilterExpression"] == {"status": "active"}


async def test_activation_rejects_an_existing_active_event() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one_and_update = AsyncMock(side_effect=DuplicateKeyError("active"))
    result, limit = await EventRepository(database).activate(str(ObjectId()))
    assert result is None and limit
    assert collection.find_one_and_update.await_count == 1


async def test_activation_preserves_invalid_transition() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one_and_update = AsyncMock(return_value=None)
    assert await EventRepository(database).activate(str(ObjectId())) == (None, False)


async def test_overlapping_activation_and_capacity_after_finish() -> None:
    # Model MongoDB's atomic status update plus unique active-status index.
    # This verifies repository behavior against that contract, not a live MongoDB server.
    documents = [event_document(), {**event_document(), "_id": ObjectId()}]
    lock = asyncio.Lock()

    async def atomic_update(query, update, **kwargs):
        async with lock:
            document = next(
                (
                    item
                    for item in documents
                    if item["_id"] == query["_id"] and item["status"] == query["status"]
                ),
                None,
            )
            if document is None:
                return None
            target = update["$set"]["status"]
            if target == EventStatus.ACTIVE and any(
                item["status"] == EventStatus.ACTIVE for item in documents
            ):
                raise DuplicateKeyError("active")
            document.update(update["$set"])
            return document.copy()

    database = MagicMock()
    database.__getitem__.return_value.find_one_and_update = AsyncMock(side_effect=atomic_update)
    repository = EventRepository(database)
    results = await asyncio.gather(*(repository.activate(str(item["_id"])) for item in documents))
    assert sum(result is not None for result, _ in results) == 1
    assert sum(limit for _, limit in results) == 1
    active = next(item for item in documents if item["status"] == EventStatus.ACTIVE)
    draft = next(item for item in documents if item["status"] == EventStatus.DRAFT)
    await repository.finish(str(active["_id"]))
    result, limit = await repository.activate(str(draft["_id"]))
    assert result is not None and not limit
    assert sum(item["status"] == EventStatus.ACTIVE for item in documents) == 1
