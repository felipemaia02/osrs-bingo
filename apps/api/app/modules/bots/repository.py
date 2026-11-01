from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


class BotKeyRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._keys = database["bot_keys"]

    async def insert(self, document: dict[str, Any]) -> bool:
        try:
            await self._keys.insert_one(document)
        except DuplicateKeyError:
            return False
        return True

    async def find_active(self, key_hash: str, now: datetime) -> dict[str, Any] | None:
        """Finds a key that isn't revoked and records that it was just used."""
        document = await self._keys.find_one_and_update(
            {"key_hash": key_hash, "revoked_at": None},
            {"$set": {"last_used_at": now}},
            projection={"key_hash": 0},
            return_document=ReturnDocument.AFTER,
        )
        return dict(document) if document else None

    async def list(self) -> list[dict[str, Any]]:
        cursor = self._keys.find({}, {"key_hash": 0}).sort("created_at", 1)
        return [dict(document) async for document in cursor]

    async def revoke(self, name: str, now: datetime) -> bool:
        result = await self._keys.update_one(
            {"name": name, "revoked_at": None}, {"$set": {"revoked_at": now}}
        )
        return result.modified_count == 1
