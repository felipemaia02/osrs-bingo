from datetime import UTC, datetime
from typing import cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.logging import get_logger, log_event
from app.modules.events.models import EventDocument
from app.modules.events.schemas import EventCreate, EventStatus, EventUpdate

EVENTS_COLLECTION = "events"


class EventRepository:
    _logger = get_logger(__name__)

    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database[EVENTS_COLLECTION]

    async def create(self, payload: EventCreate) -> EventDocument:
        now = datetime.now(UTC)
        document: EventDocument = {
            "_id": ObjectId(),
            "name": payload.name,
            "description": payload.description,
            "start_at": payload.start_at,
            "end_at": payload.end_at,
            "status": EventStatus.DRAFT,
            "created_at": now,
            "updated_at": now,
        }
        await self._collection.insert_one(document)
        log_event(self._logger, 20, "event_document_inserted", event_id=str(document["_id"]))
        return document

    async def get(self, event_id: str) -> EventDocument | None:
        object_id = self._object_id(event_id)
        if object_id is None:
            log_event(
                self._logger, 30, "event_lookup_rejected", event_id=event_id, reason="invalid_id"
            )
            return None
        document = await self._collection.find_one({"_id": object_id})
        log_event(self._logger, 20, "event_document_read", event_id=event_id, found=bool(document))
        return document

    async def list(self, status: EventStatus | None = None) -> list[EventDocument]:
        query = {"status": status} if status is not None else {}
        cursor = self._collection.find(query).sort("created_at", -1)
        documents = [document async for document in cursor]
        log_event(
            self._logger,
            20,
            "event_documents_listed",
            status=status.value if status else "all",
            count=len(documents),
        )
        return documents

    async def update_draft(self, event_id: str, payload: EventUpdate) -> EventDocument | None:
        object_id = self._object_id(event_id)
        if object_id is None:
            log_event(
                self._logger, 30, "event_update_rejected", event_id=event_id, reason="invalid_id"
            )
            return None
        changes = {**payload.model_dump(), "updated_at": datetime.now(UTC)}
        document = await self._collection.find_one_and_update(
            {"_id": object_id, "status": EventStatus.DRAFT},
            {"$set": changes},
            return_document=ReturnDocument.AFTER,
        )
        log_event(
            self._logger,
            20 if document else 30,
            "event_draft_updated",
            event_id=event_id,
            updated=bool(document),
        )
        return cast(EventDocument | None, document)

    async def activate(self, event_id: str) -> tuple[EventDocument | None, bool]:
        object_id = self._object_id(event_id)
        if object_id is None:
            log_event(
                self._logger,
                30,
                "event_activation_rejected",
                event_id=event_id,
                reason="invalid_id",
            )
            return None, False
        try:
            document = await self._collection.find_one_and_update(
                {"_id": object_id, "status": EventStatus.DRAFT},
                {"$set": {"status": EventStatus.ACTIVE, "updated_at": datetime.now(UTC)}},
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return None, True
        return cast(EventDocument | None, document), False

    async def finish(self, event_id: str) -> EventDocument | None:
        object_id = self._object_id(event_id)
        if object_id is None:
            log_event(
                self._logger, 30, "event_finish_rejected", event_id=event_id, reason="invalid_id"
            )
            return None
        document = await self._collection.find_one_and_update(
            {"_id": object_id, "status": EventStatus.ACTIVE},
            {
                "$set": {"status": EventStatus.FINISHED, "updated_at": datetime.now(UTC)},
                "$unset": {"active_slot": ""},
            },
            return_document=ReturnDocument.AFTER,
        )
        log_event(
            self._logger,
            20 if document else 30,
            "event_finished_in_database",
            event_id=event_id,
            updated=bool(document),
        )
        return cast(EventDocument | None, document)

    @staticmethod
    def _object_id(event_id: str) -> ObjectId | None:
        try:
            return ObjectId(event_id)
        except (InvalidId, TypeError):
            return None
