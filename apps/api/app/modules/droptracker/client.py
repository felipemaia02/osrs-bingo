"""DropTracker Group Export API client (feature 029): reads the group's raw drops."""

from datetime import datetime
from typing import Any

import httpx

from app.core.config import Settings

PAGE_SIZE = 500
USER_AGENT = "osrs-bingo (AstralStar clan bingo)"
TIMEOUT_SECONDS = 30
TOO_MANY_REQUESTS = 429


class DropTrackerError(Exception):
    """DropTracker refused or failed the request; the poller retries next cycle."""

    def __init__(self, status: int | None, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class DropTrackerClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self._group_id = settings.droptracker_group_id
        self._client = httpx.AsyncClient(
            base_url=settings.droptracker_base_url,
            # Header only: the key must never end up in a URL or a log line.
            headers={
                "Authorization": f"Bearer {settings.droptracker_api_key.get_secret_value()}",
                "User-Agent": USER_AGENT,
            },
            timeout=TIMEOUT_SECONDS,
            transport=transport,
        )

    async def drops_page(self, start: datetime, end: datetime, offset: int) -> list[dict[str, Any]]:
        """One page of the group's drops in [start, end], newest first."""
        try:
            response = await self._client.get(
                f"/groups/{self._group_id}/export/drops",
                params={
                    "start_time": int(start.timestamp()),
                    "end_time": int(end.timestamp()),
                    "limit": PAGE_SIZE,
                    "offset": offset,
                },
            )
        except httpx.HTTPError as exc:
            raise DropTrackerError(None, f"DropTracker unreachable: {type(exc).__name__}") from exc
        if response.status_code >= 400:
            retry = response.headers.get("Retry-After")
            raise DropTrackerError(
                response.status_code,
                f"DropTracker answered {response.status_code}",
                int(retry) if retry and retry.isdigit() else None,
            )
        rows: list[dict[str, Any]] = response.json().get("drops") or []
        return rows

    async def close(self) -> None:
        await self._client.aclose()
