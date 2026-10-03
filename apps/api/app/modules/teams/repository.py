from datetime import UTC, datetime
from typing import cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.logging import get_logger, log_event
from app.modules.teams.models import TeamDocument
from app.modules.teams.schemas import TeamCreate, TeamUpdate

TEAMS_COLLECTION = "teams"


class TeamRepository:
    _logger = get_logger(__name__)

    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database[TEAMS_COLLECTION]

    async def create(
        self, event_id: str, payload: TeamCreate, *, include_emblem: bool
    ) -> TeamDocument | None:
        event_object_id = self._object_id(event_id)
        if event_object_id is None:
            return None
        now = datetime.now(UTC)
        document: TeamDocument = {
            "_id": ObjectId(),
            "event_id": event_object_id,
            "name": payload.name,
            "normalized_name": self._normalize(payload.name),
            "color": payload.color,
            "created_at": now,
            "updated_at": now,
        }
        if include_emblem:
            document["emblem_url"] = payload.emblem_url
        try:
            await self._collection.insert_one(document)
        except DuplicateKeyError:
            log_event(self._logger, 30, "team_create_conflict", event_id=event_id)
            return None
        return document

    async def get(self, event_id: str, team_id: str) -> TeamDocument | None:
        event_object_id = self._object_id(event_id)
        team_object_id = self._object_id(team_id)
        if event_object_id is None or team_object_id is None:
            return None
        return cast(
            TeamDocument | None,
            await self._collection.find_one({"_id": team_object_id, "event_id": event_object_id}),
        )

    async def list(self, event_id: str) -> list[TeamDocument]:
        event_object_id = self._object_id(event_id)
        if event_object_id is None:
            return []
        cursor = self._collection.find({"event_id": event_object_id}).sort("created_at", 1)
        return [document async for document in cursor]

    async def update(
        self, event_id: str, team_id: str, payload: TeamUpdate, *, include_emblem: bool
    ) -> TeamDocument | None:
        event_object_id = self._object_id(event_id)
        team_object_id = self._object_id(team_id)
        if event_object_id is None or team_object_id is None:
            return None
        changes: dict[str, object] = {
            "name": payload.name,
            "normalized_name": self._normalize(payload.name),
            "color": payload.color,
            "updated_at": datetime.now(UTC),
        }
        if include_emblem:
            changes["emblem_url"] = payload.emblem_url
        try:
            document = await self._collection.find_one_and_update(
                {"_id": team_object_id, "event_id": event_object_id},
                {"$set": changes},
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return None
        return cast(TeamDocument | None, document)

    @staticmethod
    def _normalize(value: str) -> str:
        return " ".join(value.split()).casefold()

    @staticmethod
    def _object_id(value: str) -> ObjectId | None:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None
