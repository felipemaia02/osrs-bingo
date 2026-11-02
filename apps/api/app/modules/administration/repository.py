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
        self._profiles = database["player_profiles"]

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

    async def administrators(self) -> list[dict[str, Any]]:
        """Users who are administrators now, by name."""
        roles = await self.roles()
        admin_ids = roles["admin_ids"] if roles else []
        cursor = self._users.find({"discord_id": {"$in": admin_ids}}).sort("username", 1)
        return [dict(user) async for user in cursor]

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
        """Users by Discord name; a search matches the name or any linked RSN (055)."""
        query: dict[str, Any] = {}
        if search:
            pattern = {"$regex": re.escape(search), "$options": "i"}
            by_rsn = [
                profile["_id"]
                async for profile in self._profiles.find({"accounts.rsn": pattern}, {"_id": 1})
            ]
            query = {"$or": [{"username": pattern}, {"_id": {"$in": by_rsn}}]}
        total = await self._users.count_documents(query)
        cursor = (
            self._users.find(query).sort([("username", 1), ("_id", 1)]).skip(offset).limit(limit)
        )
        return [dict(user) async for user in cursor], total

    async def main_rsns(self, user_ids: list[ObjectId]) -> dict[ObjectId, str]:
        """Each user's main RSN (else their first linked account); profiles share the user id."""
        cursor = self._profiles.find(
            {"_id": {"$in": user_ids}}, {"accounts.rsn": 1, "accounts.is_main": 1}
        )
        names: dict[ObjectId, str] = {}
        async for profile in cursor:
            accounts = profile.get("accounts") or []
            main = next((item for item in accounts if item.get("is_main")), None)
            chosen = main or (accounts[0] if accounts else None)
            if chosen:
                names[profile["_id"]] = str(chosen["rsn"])
        return names
