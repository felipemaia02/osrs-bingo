"""Drop rates from the OSRS Wiki's drop tables (feature 060 rev 2)."""

import json
from typing import Any

import httpx

from app.modules.tiles.schemas import WIKI_ORIGIN

WIKI_API = f"{WIKI_ORIGIN}/api.php"
USER_AGENT = "OSRSBingo/0.1 (drop rates for card drops)"
TIMEOUT_SECONDS = 20
SOURCE_ANCHOR = "#"


class WikiRatesError(Exception):
    """The wiki is down or answered something unexpected."""


def _quoted(text: str) -> str:
    return "'" + text.replace("\\", "\\\\").replace("'", "\\'") + "'"


class WikiDropRateClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def drop_lines(self, items: list[str]) -> dict[str, list[tuple[str, str]]]:
        """Item name (lowercase) → [(source, rarity as written)], one wiki request."""
        if not items:
            return {}
        conditions = ",".join("{'item_name'," + _quoted(item) + "}" for item in items)
        query = (
            "bucket('dropsline').select('item_name','drop_json')"
            f".where(bucket.Or({conditions})).limit(500).run()"
        )
        try:
            async with httpx.AsyncClient(
                timeout=TIMEOUT_SECONDS,
                headers={"User-Agent": USER_AGENT},
                transport=self._transport,
            ) as client:
                response = await client.get(
                    WIKI_API, params={"action": "bucket", "format": "json", "query": query}
                )
            response.raise_for_status()
            rows: Any = response.json().get("bucket")
        except (httpx.HTTPError, ValueError) as error:
            raise WikiRatesError(str(error)) from error
        if not isinstance(rows, list):
            raise WikiRatesError("Unexpected wiki answer")
        lines: dict[str, list[tuple[str, str]]] = {}
        for row in rows:
            drop = json.loads(row.get("drop_json") or "{}")
            rarity = str(drop.get("Rarity") or "").strip()
            if rarity:
                lines.setdefault(str(row["item_name"]).casefold(), []).append(
                    (str(drop.get("Dropped from") or ""), rarity)
                )
        return lines
