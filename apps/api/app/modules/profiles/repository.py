import re
from datetime import UTC, datetime
from typing import Any, cast

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.profiles.models import LinkedAccount, ProfileDocument


class RsnTakenError(Exception):
    """Another user already linked this RSN (unique `accounts.normalized`)."""


class ProfileRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["player_profiles"]
        self._users = database["users"]

    async def get(self, user_id: str) -> ProfileDocument | None:
        return cast(
            ProfileDocument | None, await self._collection.find_one({"_id": ObjectId(user_id)})
        )

    async def existing_user_ids(self, user_ids: list[str]) -> set[str]:
        cursor = self._users.find({"_id": {"$in": [ObjectId(i) for i in user_ids]}}, {"_id": 1})
        return {str(user["_id"]) async for user in cursor}

    async def search_members(
        self, username_or_rsn: str, normalized_rsn: str, exclude_user_id: str, limit: int
    ) -> list[tuple[dict[str, Any], ProfileDocument | None]]:
        """Users whose Discord username or any linked RSN contains the search, with profiles."""
        by_rsn = self._collection.find(
            {"accounts.normalized": {"$regex": re.escape(normalized_rsn)}}, {"_id": 1}
        ).limit(limit)
        rsn_ids = [profile["_id"] async for profile in by_rsn]
        users = await (
            self._users.find(
                {
                    "_id": {"$ne": ObjectId(exclude_user_id)},
                    "$or": [
                        {"username": {"$regex": re.escape(username_or_rsn), "$options": "i"}},
                        {"_id": {"$in": rsn_ids}},
                    ],
                },
                {"username": 1},
            )
            .sort("username", 1)
            .limit(limit)
            .to_list(limit)
        )
        profiles = self._collection.find({"_id": {"$in": [user["_id"] for user in users]}})
        by_user = {profile["_id"]: cast(ProfileDocument, profile) async for profile in profiles}
        return [(user, by_user.get(user["_id"])) for user in users]

    async def get_or_create(self, user_id: str) -> ProfileDocument:
        now = datetime.now(UTC)
        document = await self._collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$setOnInsert": {"accounts": [], "created_at": now, "updated_at": now}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return cast(ProfileDocument, document)

    async def save_accounts(self, user_id: str, accounts: list[LinkedAccount]) -> ProfileDocument:
        return await self._set(user_id, {"accounts": accounts})

    async def save_preferences(self, user_id: str, preferences: dict[str, Any]) -> ProfileDocument:
        return await self._set(user_id, preferences)

    async def _set(self, user_id: str, changes: dict[str, Any]) -> ProfileDocument:
        try:
            document = await self._collection.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": {**changes, "updated_at": datetime.now(UTC)}},
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError as exc:
            raise RsnTakenError from exc
        return cast(ProfileDocument, document)
