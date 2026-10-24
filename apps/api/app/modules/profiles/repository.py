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
