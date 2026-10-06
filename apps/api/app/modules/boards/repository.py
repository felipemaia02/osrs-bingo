from datetime import UTC, datetime
from typing import cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.boards.models import BoardDocument
from app.modules.boards.schemas import BoardPositionResponse, BoardStatus


class BoardRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["event_boards"]

    async def get_by_event(self, event_id: str) -> BoardDocument | None:
        object_id = self._object_id(event_id)
        if object_id is None:
            return None
        return cast(BoardDocument | None, await self._collection.find_one({"event_id": object_id}))

    async def save_draft(
        self,
        event_id: str,
        positions: list[BoardPositionResponse],
        expected_revision: int,
        actor_id: str,
    ) -> BoardDocument | None:
        object_id = self._object_id(event_id)
        if object_id is None:
            return None
        now = datetime.now(UTC)
        serialized = [position.model_dump(mode="python") for position in positions]
        if expected_revision == 0:
            document: BoardDocument = {
                "_id": ObjectId(),
                "event_id": object_id,
                "status": BoardStatus.DRAFT,
                "revision": 1,
                "positions": serialized,
                "created_by": actor_id,
                "updated_by": actor_id,
                "created_at": now,
                "updated_at": now,
            }
            try:
                await self._collection.insert_one(document)
            except DuplicateKeyError:
                return None
            return document
        document = await self._collection.find_one_and_update(
            {
                "event_id": object_id,
                "status": BoardStatus.DRAFT,
                "revision": expected_revision,
            },
            {
                "$set": {
                    "positions": serialized,
                    "updated_by": actor_id,
                    "updated_at": now,
                },
                "$inc": {"revision": 1},
            },
            return_document=ReturnDocument.AFTER,
        )
        return cast(BoardDocument | None, document)

    async def publish(self, event_id: str, actor_id: str) -> None:
        object_id = self._object_id(event_id)
        if object_id is None:
            return
        await self._collection.update_one(
            {"event_id": object_id, "status": BoardStatus.DRAFT},
            {
                "$set": {
                    "status": BoardStatus.PUBLISHED,
                    "published_by": actor_id,
                    "published_at": datetime.now(UTC),
                }
            },
        )

    @staticmethod
    def _object_id(value: str) -> ObjectId | None:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None

