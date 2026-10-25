"""Reads every OSRS item from the OSRS Wiki's Bucket API (feature 033)."""

import json
from typing import Any

import httpx

from app.modules.tiles.schemas import WIKI_ORIGIN

WIKI_API = f"{WIKI_ORIGIN}/api.php"
USER_AGENT = "OSRSBingo/0.1 (item list for card drops)"
PAGE_SIZE = 5000
MAX_PAGES = 20  # ~17k rows today; stops a runaway loop if the API misbehaves
TIMEOUT_SECONDS = 30
FIELDS = ("item_name", "item_id", "image", "version_anchor", "tradeable")


class WikiItemsError(Exception):
    """The wiki is down or answered something unexpected: keep the last item list."""


class WikiItemClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def fetch_all(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        async with httpx.AsyncClient(
            timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}, transport=self._transport
        ) as client:
            for page in range(MAX_PAGES):
                batch = await self._page(client, page * PAGE_SIZE)
                rows.extend(batch)
                if len(batch) < PAGE_SIZE:
                    return rows
        return rows

    async def _page(self, client: httpx.AsyncClient, offset: int) -> list[dict[str, Any]]:
        fields = ",".join(json.dumps(field) for field in FIELDS).replace('"', "'")
        query = f"bucket('infobox_item').select({fields}).limit({PAGE_SIZE}).offset({offset}).run()"
        try:
            response = await client.get(
                WIKI_API, params={"action": "bucket", "format": "json", "query": query}
            )
            response.raise_for_status()
            body = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise WikiItemsError(str(exc)) from exc
        rows = body.get("bucket")
        if not isinstance(rows, list):
            raise WikiItemsError(str(body.get("error") or "Unexpected wiki answer"))
        return rows
