from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument, UpdateOne
from pymongo.errors import DuplicateKeyError

DROPS_COLLECTION = "droptracker_drops"
STATE_COLLECTION = "droptracker_state"
STATE_ID = "group-export"


class DropRepository:
    """Raw DropTracker drops (deduplicated by drop_id) and the poller's state."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._drops = database[DROPS_COLLECTION]
        self._state = database[STATE_COLLECTION]

    async def store(self, drops: list[dict[str, Any]]) -> int:
        """Inserts drops not seen before; returns how many were new."""
        if not drops:
            return 0
        operations = [
            UpdateOne({"drop_id": drop["drop_id"]}, {"$setOnInsert": drop}, upsert=True)
            for drop in drops
        ]
        result = await self._drops.bulk_write(operations, ordered=False)
        return int(result.upserted_count)

    async def page(
        self, filters: dict[str, Any], offset: int, limit: int
    ) -> tuple[list[dict[str, Any]], int]:
        total = await self._drops.count_documents(filters)
        cursor = (
            self._drops.find(filters, {"_id": 0})
            .sort([("received_at", -1), ("drop_id", -1)])
            .skip(offset)
            .limit(limit)
        )
        return [document async for document in cursor], int(total)

    async def count(self) -> int:
        return int(await self._drops.estimated_document_count())

    async def state(self) -> dict[str, Any] | None:
        document = await self._state.find_one({"_id": STATE_ID})
        return dict(document) if document else None

    async def save_state(self, changes: dict[str, Any]) -> None:
        await self._state.update_one({"_id": STATE_ID}, {"$set": changes}, upsert=True)

    async def acquire_lease(self, owner: str, duration: timedelta) -> bool:
        """Only one API instance polls: the lease is free, expired or already ours."""
        now = datetime.now(UTC)
        try:
            document = await self._state.find_one_and_update(
                {
                    "_id": STATE_ID,
                    "$or": [
                        {"lease_until": {"$exists": False}},
                        {"lease_until": {"$lt": now}},
                        {"lease_owner": owner},
                    ],
                },
                {"$set": {"lease_owner": owner, "lease_until": now + duration}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return False  # another instance holds it (the upsert collided with its document)
        return document is not None
