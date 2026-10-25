import re
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.modules.items.models import ItemDocument

ITEMS_COLLECTION = "osrs_items"
META_COLLECTION = "osrs_items_meta"
META_ID = "wiki-sync"
SEARCH_SCAN_LIMIT = 300


class ItemRepository:
    """Local copy of the OSRS Wiki item list (feature 033)."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._items = database[ITEMS_COLLECTION]
        self._meta = database[META_COLLECTION]

    async def synced_at(self) -> datetime | None:
        meta = await self._meta.find_one({"_id": META_ID})
        return meta.get("synced_at") if meta else None

    async def claim_sync(self, now: datetime, lease: timedelta) -> bool:
        """Only one API instance downloads at a time (e.g. while a deploy overlaps)."""
        result = await self._meta.update_one(
            {
                "_id": META_ID,
                "$or": [{"sync_until": {"$exists": False}}, {"sync_until": {"$lt": now}}],
            },
            {"$set": {"sync_until": now + lease}},
        )
        if result.modified_count:
            return True
        try:
            await self._meta.insert_one({"_id": META_ID, "sync_until": now + lease})
        except DuplicateKeyError:
            return False
        return True

    async def replace_all(self, items: list[ItemDocument], synced_at: datetime) -> None:
        """Writes the new list before removing the old one, so search never comes back empty."""
        batch = uuid4().hex
        if items:
            await self._items.insert_many([{**item, "batch": batch} for item in items])
        await self._items.delete_many({"batch": {"$ne": batch}})
        await self._meta.update_one(
            {"_id": META_ID}, {"$set": {"synced_at": synced_at, "count": len(items)}}, upsert=True
        )

    async def containing(self, normalized_query: str) -> list[dict[str, Any]]:
        cursor = self._items.find(
            {"normalized_name": {"$regex": re.escape(normalized_query)}}, {"_id": 0, "batch": 0}
        ).limit(SEARCH_SCAN_LIMIT)
        return [document async for document in cursor]

    async def named(self, normalized_names: list[str]) -> list[dict[str, Any]]:
        cursor = self._items.find(
            {"normalized_name": {"$in": normalized_names}}, {"_id": 0, "batch": 0}
        )
        return [document async for document in cursor]
