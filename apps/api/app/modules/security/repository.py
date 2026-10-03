from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


class RateLimitRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["request_limits"]

    async def increment(self, key: str, expires_at: datetime) -> int:
        update = {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": expires_at}}
        try:
            result = await self._collection.find_one_and_update(
                {"_id": key}, update, upsert=True, return_document=ReturnDocument.AFTER
            )
        except DuplicateKeyError:
            result = await self._collection.find_one_and_update(
                {"_id": key}, {"$inc": {"count": 1}}, return_document=ReturnDocument.AFTER
            )
        if result is None:
            raise RuntimeError("Rate limit counter unavailable")
        return int(result["count"])
