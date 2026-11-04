from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class ActivityRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["tile_activity"]

    async def mark(
        self,
        event_id: ObjectId,
        team_id: ObjectId,
        player_id: ObjectId,
        position: int,
        now: datetime,
        expires_at: datetime,
    ) -> None:
        """Marks the player on the tile; marking again only renews the expiry."""
        await self._collection.update_one(
            {
                "event_id": event_id,
                "team_id": team_id,
                "player_id": player_id,
                "position": position,
            },
            {"$set": {"expires_at": expires_at}, "$setOnInsert": {"since": now}},
            upsert=True,
        )

    async def unmark(
        self, event_id: ObjectId, team_id: ObjectId, player_id: ObjectId, position: int
    ) -> None:
        await self._collection.delete_one(
            {
                "event_id": event_id,
                "team_id": team_id,
                "player_id": player_id,
                "position": position,
            }
        )

    async def for_team(
        self, event_id: ObjectId, team_id: ObjectId, now: datetime
    ) -> list[dict[str, Any]]:
        """Live marks only: MongoDB's TTL job may run a minute late."""
        cursor = self._collection.find(
            {"event_id": event_id, "team_id": team_id, "expires_at": {"$gt": now}}
        ).sort([("position", 1), ("since", 1)])
        return [document async for document in cursor]
