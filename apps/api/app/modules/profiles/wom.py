"""Wise Old Man client (feature 021): read and track players, nothing else."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from app.core.config import Settings
from app.modules.profiles.schemas import COMBAT_SKILLS

NOT_FOUND_STATUS = 404
BAD_REQUEST_STATUS = 400
# WOM answers 400 with these codes when tracking an RSN that doesn't exist in OSRS.
NOT_FOUND_CODES = {"HISCORES_USERNAME_NOT_FOUND", "INVALID_USERNAME"}
UNRANKED_KILLS = -1


class WomUnavailableError(Exception):
    """WOM is down, slow or rate-limited: callers keep the last stats they have."""


@dataclass(frozen=True)
class WomStats:
    display_name: str
    total_level: int
    ehp: float
    ehb: float
    boss_kc: int
    combat: dict[str, int]
    updated_at: datetime | None


def parse_player(data: dict[str, Any]) -> WomStats:
    snapshot = (data.get("latestSnapshot") or {}).get("data") or {}
    bosses = snapshot.get("bosses") or {}
    skills = snapshot.get("skills") or {}
    overall = skills.get("overall") or {}
    updated = data.get("updatedAt")
    return WomStats(
        display_name=str(data.get("displayName") or data.get("username") or ""),
        total_level=_level(overall),
        ehp=float(data.get("ehp") or 0),
        ehb=float(data.get("ehb") or 0),
        # Unranked bosses come back as -1 kills.
        boss_kc=sum(max(int(boss.get("kills", UNRANKED_KILLS)), 0) for boss in bosses.values()),
        combat={skill: _level(skills.get(skill)) for skill in COMBAT_SKILLS},
        updated_at=datetime.fromisoformat(updated.replace("Z", "+00:00")) if updated else None,
    )


def _level(skill: dict[str, Any] | None) -> int:
    return max(int((skill or {}).get("level") or 0), 0)


class WomClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        headers = {"User-Agent": settings.wom_user_agent}
        if settings.wom_api_key.get_secret_value():
            headers["x-api-key"] = settings.wom_api_key.get_secret_value()
        self._client = httpx.AsyncClient(
            base_url=settings.wom_base_url,
            headers=headers,
            timeout=settings.wom_timeout_seconds,
            transport=transport,
        )

    async def player(self, rsn: str) -> WomStats | None:
        """Stats of a tracked player, or None when WOM doesn't know the RSN."""
        return await self._request("GET", rsn)

    async def track(self, rsn: str) -> WomStats | None:
        """Asks WOM to track/update the RSN; None when the RSN doesn't exist in OSRS."""
        return await self._request("POST", rsn)

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, rsn: str) -> WomStats | None:
        try:
            response = await self._client.request(method, f"/players/{rsn}")
        except httpx.HTTPError as exc:
            raise WomUnavailableError(str(exc)) from exc
        if response.status_code == NOT_FOUND_STATUS:
            return None
        if response.status_code == BAD_REQUEST_STATUS and _error_code(response) in NOT_FOUND_CODES:
            return None
        if response.status_code >= 400:
            raise WomUnavailableError(f"WOM answered {response.status_code}")
        return parse_player(response.json())


def _error_code(response: httpx.Response) -> str | None:
    try:
        code = response.json().get("code")
    except ValueError:
        return None
    return code if isinstance(code, str) else None
