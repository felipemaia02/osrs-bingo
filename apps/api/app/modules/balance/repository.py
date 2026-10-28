from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.balance.kc import DEFAULT_EXCLUDED

SETTINGS_COLLECTION = "settings"
BOSS_KC_ID = "boss-kc"
PROFILES_COLLECTION = "player_profiles"


class BossKcSettingsRepository:
    """Bosses that don't count in boss KC totals (feature 039)."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._settings = database[SETTINGS_COLLECTION]
        self._profiles = database[PROFILES_COLLECTION]

    async def excluded(self) -> list[str]:
        document = await self._settings.find_one({"_id": BOSS_KC_ID})
        return list(document["excluded"]) if document else list(DEFAULT_EXCLUDED)

    async def set_excluded(self, excluded: list[str], actor_id: str) -> list[str]:
        await self._settings.update_one(
            {"_id": BOSS_KC_ID},
            {
                "$set": {
                    "excluded": excluded,
                    "updated_by": actor_id,
                    "updated_at": datetime.now(UTC),
                }
            },
            upsert=True,
        )
        return excluded

    async def known_bosses(self) -> list[str]:
        """Every boss seen on a stored account, for the settings list."""
        pipeline: list[dict[str, Any]] = [
            {"$unwind": "$accounts"},
            {"$project": {"bosses": {"$objectToArray": {"$ifNull": ["$accounts.bosses", {}]}}}},
            {"$unwind": "$bosses"},
            {"$group": {"_id": "$bosses.k"}},
        ]
        return sorted([row["_id"] async for row in self._profiles.aggregate(pipeline)])
