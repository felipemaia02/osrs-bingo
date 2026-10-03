from __future__ import annotations

from builtins import list as builtin_list
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any, cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.players.models import PlayerDocument
from app.modules.players.schemas import PlayerCreate, PlayerUpdate, RegistrationStatus

PLAYERS_COLLECTION = "players"


class PlayerRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database[PLAYERS_COLLECTION]

    async def create(
        self, event_id: str, payload: PlayerCreate, user_id: str
    ) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        user_object_id = self._object_id(user_id)
        if event_object_id is None or user_object_id is None:
            return None
        now = datetime.now(UTC)
        document: PlayerDocument = {
            "_id": ObjectId(),
            "event_id": event_object_id,
            "team_id": None,
            "user_id": user_object_id,
            "status": RegistrationStatus.PENDING,
            "display_name": payload.display_name,
            "normalized_display_name": self._normalize(payload.display_name),
            "created_at": now,
            "updated_at": now,
        }
        try:
            await self._collection.insert_one(document)
        except DuplicateKeyError:
            return None
        return document

    async def get(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        player_object_id = self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one({"_id": player_object_id, "event_id": event_object_id}),
        )

    async def list(self, event_id: str) -> list[PlayerDocument]:
        event_object_id = self._object_id(event_id)
        if event_object_id is None:
            return []
        cursor = self._collection.find(
            {"event_id": event_object_id, "status": {"$ne": RegistrationStatus.REMOVED}}
        ).sort("display_name", 1)
        return [document async for document in cursor]

    async def update(
        self, event_id: str, player_id: str, payload: PlayerUpdate
    ) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        player_object_id = self._object_id(player_id)
        team_object_id = self._object_id(payload.team_id) if payload.team_id else None
        if event_object_id is None or player_object_id is None:
            return None
        document = await self._collection.find_one_and_update(
            {
                "_id": player_object_id,
                "event_id": event_object_id,
                "status": RegistrationStatus.APPROVED,
            },
            {"$set": {"team_id": team_object_id, "updated_at": datetime.now(UTC)}},
            return_document=ReturnDocument.AFTER,
        )
        return cast(PlayerDocument | None, document)

    async def get_for_user(self, event_id: str, user_id: str) -> PlayerDocument | None:
        event_object_id, user_object_id = self._object_id(event_id), self._object_id(user_id)
        if event_object_id is None or user_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one(
                {"event_id": event_object_id, "user_id": user_object_id}
            ),
        )

    async def approve(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id, player_object_id = self._object_id(event_id), self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one_and_update(
                {
                    "_id": player_object_id,
                    "event_id": event_object_id,
                    "status": RegistrationStatus.PENDING,
                },
                {"$set": {"status": RegistrationStatus.APPROVED, "updated_at": datetime.now(UTC)}},
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def approve_all(self, event_id: str) -> int:
        event_object_id = self._object_id(event_id)
        if event_object_id is None:
            return 0
        result = await self._collection.update_many(
            {"event_id": event_object_id, "status": RegistrationStatus.PENDING},
            {"$set": {"status": RegistrationStatus.APPROVED, "updated_at": datetime.now(UTC)}},
        )
        return int(result.modified_count)

    async def remove(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id, player_object_id = self._object_id(event_id), self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one_and_update(
                {
                    "_id": player_object_id,
                    "event_id": event_object_id,
                    "status": {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
                },
                {
                    "$set": {
                        "status": RegistrationStatus.REMOVED,
                        "team_id": None,
                        "updated_at": datetime.now(UTC),
                    }
                },
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def count_by_team_ids(self, team_ids: builtin_list[ObjectId]) -> dict[ObjectId, int]:
        if not team_ids:
            return {}
        pipeline: Sequence[Mapping[str, Any]] = [
            {"$match": {"team_id": {"$in": team_ids}, "status": RegistrationStatus.APPROVED}},
            {"$group": {"_id": "$team_id", "count": {"$sum": 1}}},
        ]
        return {item["_id"]: item["count"] async for item in self._collection.aggregate(pipeline)}

    @staticmethod
    def _normalize(value: str) -> str:
        return " ".join(value.split()).casefold()

    @staticmethod
    def _object_id(value: str | None) -> ObjectId | None:
        if value is None:
            return None
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None
