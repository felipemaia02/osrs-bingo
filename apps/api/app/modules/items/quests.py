"""Quest points of each quest, read weekly from the OSRS Wiki quest tables (feature 034)."""

import html
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.items.client import TIMEOUT_SECONDS, USER_AGENT, WIKI_API, WikiItemsError
from app.modules.items.names import normalize_name

QUEST_PAGES = ("Quests/Free-to-play", "Quests/Members")
# Fewer quests than this means the tables changed shape: keep the last copy.
MIN_EXPECTED_QUESTS = 150
MAX_AGE = timedelta(days=7)
META_COLLECTION = "osrs_items_meta"
META_ID = "quest-points"

_TABLE = re.compile(r"<table[^>]*>(.*?)</table>", re.S)
_ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
_CELL = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)
_HEAD = re.compile(r"<th[^>]*>(.*?)</th>", re.S)
_TAG = re.compile(r"<[^>]+>")


def _text(cell: str) -> str:
    return " ".join(html.unescape(_TAG.sub("", cell)).split())


def parse_quest_points(page_html: str) -> dict[str, int]:
    """Quest name -> points from a wiki quest table ("#, Name, Difficulty, Length, QP, …")."""
    points: dict[str, int] = {}
    for table in _TABLE.findall(page_html):
        rows = _ROW.findall(table)
        if not rows:
            continue
        head = [_text(cell) for cell in _HEAD.findall(rows[0])]
        if "Name" not in head or "Length" not in head:
            continue
        name_at, points_at = head.index("Name"), head.index("Length") + 1
        number_at = head.index("#") if "#" in head else None
        for row in rows[1:]:
            cells = [_text(cell) for cell in _CELL.findall(row)]
            if len(cells) <= points_at or not cells[name_at] or not cells[points_at].isdigit():
                continue
            # Sub-quests ("100.1" Recipe for Disaster parts) are already in the main quest.
            if number_at is not None and not cells[number_at].isdigit():
                continue
            points[cells[name_at]] = int(cells[points_at])
    return points


class QuestPointClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def fetch(self) -> dict[str, int]:
        points: dict[str, int] = {}
        async with httpx.AsyncClient(
            timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}, transport=self._transport
        ) as client:
            for page in QUEST_PAGES:
                try:
                    response = await client.get(
                        WIKI_API,
                        params={
                            "action": "parse",
                            "page": page,
                            "prop": "text",
                            "format": "json",
                            "formatversion": 2,
                        },
                    )
                    response.raise_for_status()
                    text = str(response.json()["parse"]["text"])
                except (httpx.HTTPError, ValueError, KeyError) as exc:
                    raise WikiItemsError(str(exc)) from exc
                points.update(parse_quest_points(text))
        if len(points) < MIN_EXPECTED_QUESTS:
            raise WikiItemsError(f"Only {len(points)} quests found on the wiki")
        return points


class QuestPointService:
    """Keeps the quest points table in one document next to the item list meta."""

    def __init__(
        self,
        database: AsyncIOMotorDatabase,  # type: ignore[type-arg]
        client: QuestPointClient | None = None,
    ) -> None:
        self._meta = database[META_COLLECTION]
        self._client = client

    async def points(self) -> dict[str, int]:
        """Normalized quest name -> points; empty until the first download."""
        document: dict[str, Any] | None = await self._meta.find_one({"_id": META_ID})
        return dict(document["points"]) if document else {}

    async def sync_if_stale(self, now: datetime | None = None) -> int | None:
        moment = now or datetime.now(UTC)
        document = await self._meta.find_one({"_id": META_ID}, {"synced_at": 1})
        synced = document.get("synced_at") if document else None
        if synced is not None:
            synced = synced if synced.tzinfo else synced.replace(tzinfo=UTC)
            if synced > moment - MAX_AGE:
                return None
        if self._client is None:
            return None
        table = await self._client.fetch()
        points = {normalize_name(name): value for name, value in table.items()}
        await self._meta.update_one(
            {"_id": META_ID}, {"$set": {"points": points, "synced_at": moment}}, upsert=True
        )
        return len(points)
