from typing import ClassVar

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.logging import get_logger, log_event

logger = get_logger(__name__)


class IndexManager:
    """Manages MongoDB index definitions and their application at startup."""

    _definitions: ClassVar[list[tuple[str, list[tuple[str, int]], dict[str, object]]]] = [
        (
            "events",
            [("status", 1)],
            {
                "name": "events_single_active_unique",
                "unique": True,
                "partialFilterExpression": {"status": "active"},
            },
        ),
        ("events", [("status", 1), ("created_at", -1)], {"name": "events_status_created_at"}),
        (
            "teams",
            [("event_id", 1), ("normalized_name", 1)],
            {"name": "teams_event_normalized_name_unique", "unique": True},
        ),
        (
            "players",
            [("event_id", 1), ("normalized_display_name", 1)],
            {"name": "players_event_normalized_name_unique", "unique": True},
        ),
        ("players", [("event_id", 1), ("team_id", 1)], {"name": "players_event_team"}),
        (
            "players",
            [("event_id", 1), ("user_id", 1)],
            {
                "name": "players_event_user_unique",
                "unique": True,
                "partialFilterExpression": {"user_id": {"$type": "objectId"}},
            },
        ),
        ("users", [("discord_id", 1)], {"name": "users_discord_unique", "unique": True}),
        ("auth_states", [("expires_at", 1)], {"name": "auth_states_ttl", "expireAfterSeconds": 0}),
        ("sessions", [("expires_at", 1)], {"name": "sessions_ttl", "expireAfterSeconds": 0}),
        (
            "request_limits",
            [("expires_at", 1)],
            {"name": "request_limits_ttl", "expireAfterSeconds": 0},
        ),
        ("tile_cards", [("slug", 1)], {"name": "tile_cards_slug_unique", "unique": True}),
        (
            "tile_cards",
            [("status", 1), ("revisions.0.name", 1)],
            {"name": "tile_cards_status_name"},
        ),
        ("catalog_imports", [("imported_at", -1)], {"name": "catalog_imports_imported_at"}),
        (
            "event_boards",
            [("event_id", 1)],
            {"name": "event_boards_event_unique", "unique": True},
        ),
    ]

    async def ensure_all(self, db: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        log_event(logger, 20, "database_indexes_ensuring", count=len(self._definitions))
        for collection, keys, options in self._definitions:
            try:
                await db[collection].create_index(keys, **options)  # type: ignore[arg-type]
            except DuplicateKeyError as exc:
                if options.get("name") != "events_single_active_unique":
                    raise
                raise RuntimeError(
                    "Multiple legacy events are active. Explicitly finish the surplus events "
                    "before restarting the API; no event was changed automatically. "
                    "See docs/architecture/authentication.md (Operator recovery and upgrades)."
                ) from exc
        await db["players"].update_many(
            {"status": {"$exists": False}}, {"$set": {"status": "approved"}}
        )
        log_event(logger, 20, "database_indexes_ready")
