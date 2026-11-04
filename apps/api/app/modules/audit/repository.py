import re
from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

Position = tuple[datetime, ObjectId]


class AuditRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["audit_log"]

    async def insert(self, document: dict[str, Any]) -> None:
        await self._collection.insert_one(document)

    async def find(
        self, filters: dict[str, Any], cursor: Position | None, limit: int, newest_first: bool
    ) -> list[dict[str, Any]]:
        """Entries strictly past the cursor in the chosen direction."""
        operator, order = ("$lt", DESCENDING) if newest_first else ("$gt", ASCENDING)
        if cursor is not None:
            at, entry_id = cursor
            past = {"$or": [{"at": {operator: at}}, {"at": at, "_id": {operator: entry_id}}]}
            filters = {"$and": [filters, past]}
        found = self._collection.find(filters).sort([("at", order), ("_id", order)]).limit(limit)
        return [document async for document in found]


def build_filters(
    event_id: ObjectId | None,
    group: str | None,
    actor: str | None,
    since: datetime | None,
    until: datetime | None,
) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    if event_id is not None:
        filters["event_id"] = event_id
    if group:
        filters["action"] = {"$regex": f"^{re.escape(group)}\\."}
    if actor:
        filters["actor.name"] = {"$regex": re.escape(actor), "$options": "i"}
    period = {key: value for key, value in (("$gte", since), ("$lte", until)) if value}
    if period:
        filters["at"] = period
    return filters
