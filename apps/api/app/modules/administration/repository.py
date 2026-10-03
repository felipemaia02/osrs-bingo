import re
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

ROLE_DOCUMENT_ID = "global-administrators"


class AdministrationRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._roles = database["administration"]
        self._users = database["users"]

    async def initialize(self, discord_ids: list[str]) -> None:
        if discord_ids:
            await self._roles.update_one(
                {"_id": ROLE_DOCUMENT_ID},
                {
                    "$setOnInsert": {
                        "admin_ids": sorted(set(discord_ids)),
                        "revision": 0,
                        "audit": [],
                        "created_at": datetime.now(UTC),
                    }
                },
                upsert=True,
            )

    async def roles(self) -> dict[str, Any] | None:
        result = await self._roles.find_one({"_id": ROLE_DOCUMENT_ID}, {"audit": 0})
        return dict(result) if result else None

    async def change_roles(
        self, revision: int, admin_ids: list[str], audit: dict[str, Any]
    ) -> bool:
        result = await self._roles.update_one(
            {"_id": ROLE_DOCUMENT_ID, "revision": revision},
            {"$set": {"admin_ids": admin_ids}, "$inc": {"revision": 1}, "$push": {"audit": audit}},
        )
        return result.modified_count == 1

    async def get_user(self, user_id: str) -> dict[str, Any] | None:
        try:
            object_id = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        result = await self._users.find_one({"_id": object_id})
        return dict(result) if result else None

    async def directory(
        self, search: str, offset: int, limit: int
    ) -> tuple[list[dict[str, Any]], int]:
        query = {"username": {"$regex": re.escape(search), "$options": "i"}} if search else {}
        total = await self._users.count_documents(query)
        cursor = (
            self._users.find(query).sort([("username", 1), ("_id", 1)]).skip(offset).limit(limit)
        )
        return [dict(user) async for user in cursor], total
