from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from typing import Any

from app.modules.items.client import WikiItemClient
from app.modules.items.models import icon_url, to_items
from app.modules.items.names import normalize_name
from app.modules.items.repository import ItemRepository
from app.modules.items.schemas import ItemOption, ItemSearchResponse

# The wiki list changes slowly: one download (4 requests) a week at most.
MAX_AGE = timedelta(days=7)
SYNC_LEASE = timedelta(minutes=10)
MIN_QUERY_LENGTH = 2
MAX_OPTIONS = 20


class ItemService:
    def __init__(self, repository: ItemRepository, client: WikiItemClient | None = None) -> None:
        self._repository = repository
        self._client = client

    async def search(self, query: str) -> ItemSearchResponse:
        ready = await self._repository.synced_at() is not None
        text = normalize_name(query)
        if len(text) < MIN_QUERY_LENGTH:
            return ItemSearchResponse(ready=ready, items=[])
        groups = _group(await self._repository.containing(text))
        ordered = sorted(
            groups.values(),
            key=lambda rows: (
                not rows[0]["normalized_name"].startswith(text),
                len(rows[0]["name"]),
                rows[0]["name"],
            ),
        )
        options = [option for rows in ordered for option in _options(rows)]
        return ItemSearchResponse(ready=ready, items=options[:MAX_OPTIONS])

    async def ids_by_name(self, names: Iterable[str]) -> dict[str, list[int]]:
        """Every item ID of each exact name (any version), keyed by normalized name."""
        wanted = sorted({normalize_name(name) for name in names})
        found: dict[str, set[int]] = {}
        for row in await self._repository.named(wanted):
            found.setdefault(row["normalized_name"], set()).update(row["item_ids"])
        return {name: sorted(ids) for name, ids in found.items()}

    async def sync_if_stale(self, now: datetime | None = None) -> int | None:
        """Downloads the wiki list when missing or older than a week; None when not needed."""
        moment = now or datetime.now(UTC)
        synced = await self._repository.synced_at()
        if synced is not None and _utc(synced) > moment - MAX_AGE:
            return None
        if self._client is None or not await self._repository.claim_sync(moment, SYNC_LEASE):
            return None
        items = to_items(await self._client.fetch_all())
        await self._repository.replace_all(items, moment)
        return len(items)


def _utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _group(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        groups.setdefault(row["normalized_name"], []).append(row)
    return groups


def _options(rows: list[dict[str, Any]]) -> list[ItemOption]:
    """One option for a single-version item; "any version" first, then each version, otherwise."""
    name = rows[0]["name"]
    versions = sorted(rows, key=lambda row: row["label"].casefold())
    plain = next((row for row in versions if row["label"] == name), versions[0])
    every_id = sorted({item_id for row in rows for item_id in row["item_ids"]})
    any_version = ItemOption(
        name=name,
        label=name,
        item_ids=every_id,
        icon_url=icon_url(plain["image"]),
        any_version=True,
        versions=len(rows),
    )
    if len(rows) == 1:
        return [any_version]
    return [
        any_version,
        *(
            ItemOption(
                name=name,
                label=row["label"],
                item_ids=row["item_ids"],
                icon_url=icon_url(row["image"]),
                any_version=False,
                versions=len(rows),
            )
            for row in versions
        ),
    ]
