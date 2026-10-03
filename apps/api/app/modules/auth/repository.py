from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument


class AuthRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._roles = database["administration"]
        self._users = database["users"]
        self._states = database["auth_states"]
        self._sessions = database["sessions"]

    async def save_state(self, token_hash: str, expires_at: datetime) -> None:
        await self._states.insert_one({"_id": token_hash, "expires_at": expires_at})

    async def consume_state(self, token_hash: str, now: datetime) -> bool:
        return (
            await self._states.find_one_and_delete({"_id": token_hash, "expires_at": {"$gt": now}})
            is not None
        )

    async def upsert_user(self, discord_id: str, username: str, now: datetime) -> dict[str, Any]:
        document = await self._users.find_one_and_update(
            {"discord_id": discord_id},
            {
                "$set": {"username": username, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        assert document is not None
        return dict(document)

    async def save_session(self, token_hash: str, user_id: ObjectId, expires_at: datetime) -> None:
        await self._sessions.insert_one(
            {"_id": token_hash, "user_id": user_id, "expires_at": expires_at}
        )

    async def session_user(self, token_hash: str, now: datetime) -> dict[str, Any] | None:
        session = await self._sessions.find_one({"_id": token_hash, "expires_at": {"$gt": now}})
        if session is None:
            return None
        user = await self._users.find_one({"_id": session["user_id"]})
        return dict(user) if user else None

    async def delete_session(self, token_hash: str) -> None:
        await self._sessions.delete_one({"_id": token_hash})

    async def is_administrator(self, discord_id: str) -> bool:
        return (
            await self._roles.find_one(
                {"_id": "global-administrators", "admin_ids": discord_id}, {"_id": 1}
            )
            is not None
        )
