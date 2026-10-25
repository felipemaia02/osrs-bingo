"""Phase 1 of the DropTracker integration (feature 029): observe the clan's drops.

Never touches events, submissions or scores (BR-001).
"""

import re
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import Settings
from app.modules.droptracker.client import PAGE_SIZE, DropTrackerClient, DropTrackerError
from app.modules.droptracker.repository import DropRepository
from app.modules.droptracker.schemas import DropPage, DropQuery, DropRecord, DropTrackerStatus

FIRST_RUN_LOOKBACK = timedelta(hours=1)
# Drops accepted while a previous poll was running are picked up again; drop_id dedupes.
WINDOW_OVERLAP = timedelta(minutes=10)
# The export API pages by offset up to 100,000 rows.
MAX_PAGES = 200


class DropTrackerService:
    def __init__(
        self, drops: DropRepository, client: DropTrackerClient | None, settings: Settings
    ) -> None:
        self._drops = drops
        self._client = client
        self._settings = settings

    async def poll_once(self, now: datetime | None = None) -> int:
        """Fetches drops since the last success (minus an overlap); returns how many were new."""
        if self._client is None:
            raise DropTrackerError(None, "DropTracker key is not configured")
        end = now or datetime.now(UTC)
        state = await self._drops.state() or {}
        newest = self._utc(state.get("newest_received_at"))
        start = (newest - WINDOW_OVERLAP) if newest else end - FIRST_RUN_LOOKBACK
        added = 0
        try:
            for page in range(MAX_PAGES):
                rows = await self._client.drops_page(start, end, page * PAGE_SIZE)
                documents = [self._document(row, end) for row in rows]
                added += await self._drops.store(documents)
                newest = max([newest, *(doc["received_at"] for doc in documents)], key=self._key)
                if len(rows) < PAGE_SIZE:
                    break
        except DropTrackerError as exc:
            await self._drops.save_state({"last_poll_at": end, "last_error": str(exc)})
            raise
        await self._drops.save_state(
            {
                "last_poll_at": end,
                "last_success_at": end,
                "last_error": None,
                "last_added": added,
                "newest_received_at": newest,
            }
        )
        return added

    async def status(self) -> DropTrackerStatus:
        state = await self._drops.state() or {}
        return DropTrackerStatus(
            ingest_enabled=self._settings.droptracker_ingest_enabled,
            bingo_enabled=self._settings.droptracker_bingo_enabled,
            group_id=self._settings.droptracker_group_id,
            poll_seconds=self._settings.droptracker_poll_seconds,
            key_configured=bool(self._settings.droptracker_api_key.get_secret_value()),
            last_poll_at=self._utc(state.get("last_poll_at")),
            last_success_at=self._utc(state.get("last_success_at")),
            last_error=state.get("last_error"),
            newest_received_at=self._utc(state.get("newest_received_at")),
            last_added=state.get("last_added"),
            stored_drops=await self._drops.count(),
            bingo_outcomes=await self._drops.outcome_counts(),
        )

    async def drops(self, query: DropQuery) -> DropPage:
        filters: dict[str, Any] = {}
        for field, value in (
            ("player_name", query.player),
            ("npc_name", query.npc),
            ("item_name", query.item),
        ):
            if value.strip():
                filters[field] = {"$regex": re.escape(value.strip()), "$options": "i"}
        if query.min_value:
            filters["total_value"] = {"$gte": query.min_value}
        rows, total = await self._drops.page(filters, query.offset, query.limit)
        return DropPage(
            items=[
                DropRecord(
                    **{
                        **row,
                        "received_at": self._utc(row["received_at"]),
                        "ingested_at": self._utc(row["ingested_at"]),
                    }
                )
                for row in rows
            ],
            total=total,
            offset=query.offset,
            limit=query.limit,
        )

    def _document(self, row: dict[str, Any], ingested_at: datetime) -> dict[str, Any]:
        received_at = datetime.fromtimestamp(int(row["received_at"]), UTC)
        return {
            "drop_id": int(row["drop_id"]),
            "player_id": row.get("player_id"),
            "player_name": row.get("player_name") or "",
            "npc_id": row.get("npc_id"),
            "npc_name": row.get("npc_name"),
            "item_id": row.get("item_id"),
            "item_name": row.get("item_name") or "",
            "quantity": int(row.get("quantity") or 1),
            "value_each": row.get("value_each"),
            "total_value": row.get("total_value"),
            "received_at": received_at,
            "image_url": row.get("image_url"),
            "ingested_at": ingested_at,
            # TTL index on this field removes raw drops after the retention period.
            "expires_at": received_at + timedelta(days=self._settings.droptracker_retention_days),
        }

    @staticmethod
    def _utc(moment: datetime | None) -> datetime | None:
        if moment is None:
            return None
        return moment if moment.tzinfo else moment.replace(tzinfo=UTC)

    @staticmethod
    def _key(moment: datetime | None) -> datetime:
        return moment or datetime.min.replace(tzinfo=UTC)
