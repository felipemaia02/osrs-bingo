from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.modules.droptracker.client import PAGE_SIZE, DropTrackerClient, DropTrackerError
from app.modules.droptracker.service import (
    FIRST_RUN_LOOKBACK,
    WINDOW_OVERLAP,
    DropTrackerService,
)

NOW = datetime(2026, 10, 24, 21, 30, tzinfo=UTC)
SETTINGS = Settings(droptracker_api_key=SecretStr("secret-key"), droptracker_group_id=126)


def row(drop_id: int, minutes_ago: int = 1) -> dict[str, Any]:
    return {
        "drop_id": drop_id,
        "player_id": 7,
        "player_name": "Hepolainen",
        "npc_id": 8615,
        "npc_name": "Alchemical Hydra",
        "item_id": 22966,
        "item_name": "Hydra's claw",
        "quantity": 1,
        "value_each": 38_080_000,
        "total_value": 38_080_000,
        "received_at": int((NOW - timedelta(minutes=minutes_ago)).timestamp()),
        "image_url": None,
    }


class FakeDrops:
    def __init__(self) -> None:
        self.stored: dict[int, dict[str, Any]] = {}
        self.saved: dict[str, Any] = {}

    async def store(self, drops: list[dict[str, Any]]) -> int:
        new = [drop for drop in drops if drop["drop_id"] not in self.stored]
        self.stored.update({drop["drop_id"]: drop for drop in new})
        return len(new)

    async def state(self) -> dict[str, Any] | None:
        return dict(self.saved) or None

    async def save_state(self, changes: dict[str, Any]) -> None:
        self.saved.update(changes)

    async def count(self) -> int:
        return len(self.stored)


class FakeClient:
    def __init__(self, pages: list[list[dict[str, Any]]]) -> None:
        self.pages = pages
        self.calls: list[tuple[datetime, datetime, int]] = []

    async def drops_page(self, start: datetime, end: datetime, offset: int) -> list[dict[str, Any]]:
        self.calls.append((start, end, offset))
        return self.pages[offset // PAGE_SIZE] if offset // PAGE_SIZE < len(self.pages) else []


async def test_first_poll_looks_back_an_hour_and_pages_until_a_short_page() -> None:
    drops = FakeDrops()
    full = [row(i, minutes_ago=2) for i in range(PAGE_SIZE)]
    client = FakeClient([full, [row(9999, minutes_ago=1)]])
    service = DropTrackerService(drops, client, SETTINGS)  # type: ignore[arg-type]

    added = await service.poll_once(NOW)

    assert added == PAGE_SIZE + 1
    assert [call[2] for call in client.calls] == [0, PAGE_SIZE]
    assert client.calls[0][0] == NOW - FIRST_RUN_LOOKBACK and client.calls[0][1] == NOW
    assert drops.saved["newest_received_at"] == NOW - timedelta(minutes=1)
    assert drops.saved["last_added"] == PAGE_SIZE + 1 and drops.saved["last_error"] is None
    stored = drops.stored[9999]
    assert stored["item_name"] == "Hydra's claw"
    assert stored["expires_at"] == stored["received_at"] + timedelta(days=30)


async def test_next_poll_starts_before_the_newest_drop_and_dedupes() -> None:
    drops = FakeDrops()
    first = FakeClient([[row(1, minutes_ago=5)]])
    await DropTrackerService(drops, first, SETTINGS).poll_once(NOW)  # type: ignore[arg-type]

    second = FakeClient([[row(1, minutes_ago=5), row(2, minutes_ago=1)]])
    added = await DropTrackerService(drops, second, SETTINGS).poll_once(  # type: ignore[arg-type]
        NOW + timedelta(minutes=5)
    )

    assert added == 1
    assert second.calls[0][0] == NOW - timedelta(minutes=5) - WINDOW_OVERLAP


async def test_failures_are_recorded_and_raised() -> None:
    class Failing:
        async def drops_page(self, *_: object) -> list[dict[str, Any]]:
            raise DropTrackerError(403, "DropTracker answered 403")

    drops = FakeDrops()
    with pytest.raises(DropTrackerError):
        await DropTrackerService(drops, Failing(), SETTINGS).poll_once(NOW)  # type: ignore[arg-type]
    assert drops.saved["last_error"] == "DropTracker answered 403"
    assert "last_success_at" not in drops.saved


async def test_client_sends_the_key_only_in_a_header_and_maps_errors() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.params["offset"] == "500":
            return httpx.Response(429, headers={"Retry-After": "42"})
        return httpx.Response(200, json={"drops": [row(1)], "count": 1})

    client = DropTrackerClient(SETTINGS, transport=httpx.MockTransport(handler))
    rows = await client.drops_page(NOW - timedelta(hours=1), NOW, 0)

    assert rows[0]["drop_id"] == 1
    assert seen[0].url.path == "/groups/126/export/drops"
    assert seen[0].headers["authorization"] == "Bearer secret-key"
    assert "secret-key" not in str(seen[0].url)
    with pytest.raises(DropTrackerError) as limited:
        await client.drops_page(NOW - timedelta(hours=1), NOW, 500)
    assert limited.value.status == 429 and limited.value.retry_after == 42


async def test_client_reports_network_failures() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    client = DropTrackerClient(SETTINGS, transport=httpx.MockTransport(handler))
    with pytest.raises(DropTrackerError) as failed:
        await client.drops_page(NOW, NOW, 0)
    assert failed.value.status is None and "secret-key" not in str(failed.value)


async def test_without_a_key_the_service_refuses_to_poll() -> None:
    with pytest.raises(DropTrackerError, match="not configured"):
        await DropTrackerService(FakeDrops(), None, SETTINGS).poll_once(NOW)  # type: ignore[arg-type]
