from __future__ import annotations

import re
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

    async def page(
        self,
        event_id: str,
        *,
        status: RegistrationStatus | None,
        assigned: bool | None,
        search: str,
        team_id: str | None,
        offset: int,
        limit: int,
    ) -> tuple[builtin_list[PlayerDocument], int]:
        query: dict[str, Any] = {
            "event_id": self._object_id(event_id),
            "status": status
            if status
            else {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
        }
        if assigned is not None:
            query["team_id"] = {"$ne": None} if assigned else None
        if team_id:
            query["team_id"] = self._object_id(team_id)
            if assigned is False:
                query["_id"] = {"$exists": False}
        if search.strip():
            query["normalized_display_name"] = {"$regex": re.escape(self._normalize(search))}
        total = await self._collection.count_documents(query)
        cursor = (
            self._collection.find(query)
            .sort([("normalized_display_name", 1), ("_id", 1)])
            .skip(offset)
            .limit(limit)
        )
        return [document async for document in cursor], int(total)

    async def counts(self, event_id: str) -> dict[str, int]:
        base = {"event_id": self._object_id(event_id)}
        pending = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.PENDING}
        )
        unassigned = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.APPROVED, "team_id": None}
        )
        assigned = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.APPROVED, "team_id": {"$ne": None}}
        )
        return {"pending": int(pending), "unassigned": int(unassigned), "assigned": int(assigned)}

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
