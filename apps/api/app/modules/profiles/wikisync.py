"""OSRS Wiki WikiSync client (feature 034): quests and achievement diaries of a player.

Only players who use the WikiSync RuneLite plugin have data; it's as of their last login.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import quote

import httpx

from app.modules.items.names import normalize_name
from app.modules.profiles.schemas import (
    DiaryRegion,
    KeyQuest,
    WikiSyncResponse,
    WikiSyncStatus,
)

WIKISYNC_URL = "https://sync.runescape.wiki/runelite/player/{rsn}/STANDARD"
USER_AGENT = "OSRSBingo/0.1 (team balance: quests and diaries)"
TIMEOUT_SECONDS = 10
NO_DATA_CODE = "NO_USER_DATA"
QUEST_COMPLETE = 2
TIERS = ("easy", "medium", "hard", "elite")
# Quests that unlock bingo content, shown to admins balancing teams (feature 045): code -> name.
KEY_QUESTS = {
    "WGS": "While Guthix Sleeps",
    "SotE": "Song of the Elves",
    "DT2": "Desert Treasure II - The Fallen Empire",
    "DS2": "Dragon Slayer II",
    "BMR": "The Blood Moon Rises",
    "SotN": "Secrets of the North",
}


class WikiSyncUnavailableError(Exception):
    """WikiSync is down or slow: the last data is kept."""


@dataclass(frozen=True)
class WikiSyncData:
    completed_quests: list[str]
    quests_total: int
    # Region -> tier -> complete.
    diaries: dict[str, dict[str, bool]]


def parse_player(body: dict[str, Any]) -> WikiSyncData:
    quests = {
        name: status for name, status in (body.get("quests") or {}).items() if name.strip(". ")
    }
    diaries = {
        region: {
            tier: bool(((tiers or {}).get(tier.capitalize()) or {}).get("complete"))
            for tier in TIERS
        }
        for region, tiers in (body.get("achievement_diaries") or {}).items()
    }
    return WikiSyncData(
        completed_quests=sorted(
            name for name, status in quests.items() if status == QUEST_COMPLETE
        ),
        quests_total=len(quests),
        diaries=diaries,
    )


class WikiSyncClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def player(self, rsn: str) -> WikiSyncData | None:
        """None when the player doesn't use the WikiSync plugin."""
        try:
            async with httpx.AsyncClient(
                timeout=TIMEOUT_SECONDS,
                headers={"User-Agent": USER_AGENT},
                transport=self._transport,
            ) as client:
                response = await client.get(WIKISYNC_URL.format(rsn=quote(rsn)))
        except httpx.HTTPError as exc:
            raise WikiSyncUnavailableError(str(exc)) from exc
        if response.status_code >= 400:
            if _error_code(response) == NO_DATA_CODE:
                return None
            raise WikiSyncUnavailableError(f"WikiSync answered {response.status_code}")
        try:
            return parse_player(response.json())
        except ValueError as exc:
            raise WikiSyncUnavailableError("WikiSync answered something unexpected") from exc


def _error_code(response: httpx.Response) -> str | None:
    try:
        code = response.json().get("code")
    except ValueError:
        return None
    return code if isinstance(code, str) else None


def stored(data: WikiSyncData, quest_points: dict[str, int], now: datetime) -> dict[str, Any]:
    """What the account keeps. With the wiki quest table, quest points are summed now and only
    real quests are counted (WikiSync also lists miniquests and quest parts)."""
    completed = [normalize_name(name) for name in data.completed_quests]
    done_names = set(completed)
    if quest_points:
        done = [name for name in completed if name in quest_points]
        counts = (len(done), len(quest_points))
        points: int | None = sum(quest_points[name] for name in done)
    else:
        counts, points = (len(completed), data.quests_total), None
    return {
        "status": WikiSyncStatus.FOUND,
        "quest_points": points,
        "quests_completed": counts[0],
        "quests_total": counts[1],
        "diaries": data.diaries,
        "key_quests": {
            code: normalize_name(name) in done_names for code, name in KEY_QUESTS.items()
        },
        "checked_at": now,
    }


def summary(document: dict[str, Any] | None) -> WikiSyncResponse | None:
    if not document:
        return None
    diaries = [
        DiaryRegion(region=region, **{tier: bool(tiers.get(tier)) for tier in TIERS})
        for region, tiers in sorted((document.get("diaries") or {}).items())
    ]
    return WikiSyncResponse(
        status=document["status"],
        quest_points=document.get("quest_points"),
        quests_completed=document.get("quests_completed"),
        quests_total=document.get("quests_total"),
        hard_diaries=sum(region.hard for region in diaries) if diaries else None,
        diaries=diaries,
        key_quests=_key_quests(document.get("key_quests")),
        checked_at=document.get("checked_at"),
    )


def _key_quests(done: dict[str, bool] | None) -> list[KeyQuest] | None:
    if done is None:
        return None
    return [
        KeyQuest(code=code, name=name, done=bool(done.get(code)))
        for code, name in KEY_QUESTS.items()
    ]
