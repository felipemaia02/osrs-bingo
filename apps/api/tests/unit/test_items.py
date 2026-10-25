from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.modules.items.client import PAGE_SIZE, WikiItemClient, WikiItemsError
from app.modules.items.models import icon_url, to_items
from app.modules.items.names import normalize_name
from app.modules.items.service import ItemService

NOW = datetime(2026, 10, 25, tzinfo=UTC)
ROWS: list[dict[str, Any]] = [
    {"item_name": "Bird nest", "item_id": ["5074"], "image": ["File:Bird nest (ring).png"]},
    {"item_name": "Bird nest", "item_id": ["22798"], "image": ["File:Bird nest (seeds).png"]},
    {"item_name": "Bird nest", "item_id": ["5075"], "image": ["File:Bird nest (empty).png"]},
    {"item_name": "Hydra's claw", "item_id": ["22966"], "image": ["File:Hydra's claw.png"]},
    {"item_name": "Hydra's claw", "item_id": ["22966"], "image": ["File:Hydra's claw.png"]},
    {"item_name": "Coins", "item_id": ["995"], "image": ["File:Coins 10000.png"]},
    {
        "item_name": "Bird nest",
        "item_id": ["5070"],
        "image": ["File:Red egg nest.png"],
        "version_anchor": "Red egg",
    },
    {"item_name": "No id", "item_id": [], "image": []},
    {"item_name": "", "item_id": ["1"]},
]


def test_rows_become_items_with_version_labels_and_no_duplicates() -> None:
    items = {(item["label"], tuple(item["item_ids"])) for item in to_items(ROWS)}

    assert items == {
        ("Bird nest (ring)", (5074,)),
        ("Bird nest (seeds)", (22798,)),
        ("Bird nest (empty)", (5075,)),
        ("Bird nest (Red egg)", (5070,)),
        ("Hydra's claw", (22966,)),
        ("Coins", (995,)),
    }
    assert icon_url("Hydra's claw.png") == (
        "https://oldschool.runescape.wiki/images/Hydra%27s_claw.png"
    )


class FakeItems:
    def __init__(self, rows: list[dict[str, Any]], synced_at: datetime | None = NOW) -> None:
        self.rows = [dict(item) for item in to_items(rows)]
        self.synced = synced_at
        self.replaced: list[Any] | None = None

    async def synced_at(self) -> datetime | None:
        return self.synced

    async def containing(self, text: str) -> list[dict[str, Any]]:
        return [row for row in self.rows if text in row["normalized_name"]]

    async def named(self, names: list[str]) -> list[dict[str, Any]]:
        return [row for row in self.rows if row["normalized_name"] in names]

    async def claim_sync(self, now: datetime, lease: timedelta) -> bool:
        self.claims = getattr(self, "claims", 0) + 1
        return self.claims == 1

    async def replace_all(self, items: list[Any], synced_at: datetime) -> None:
        self.replaced, self.synced = items, synced_at


async def test_search_lists_any_version_first_then_each_version() -> None:
    service = ItemService(FakeItems(ROWS))  # type: ignore[arg-type]

    result = await service.search("  BIRD ")

    assert result.ready
    assert [(item.label, item.any_version) for item in result.items] == [
        ("Bird nest", True),
        ("Bird nest (empty)", False),
        ("Bird nest (Red egg)", False),
        ("Bird nest (ring)", False),
        ("Bird nest (seeds)", False),
    ]
    assert result.items[0].item_ids == [5070, 5074, 5075, 22798]
    assert result.items[0].versions == 4


async def test_search_puts_names_starting_with_the_text_first_and_needs_two_letters() -> None:
    service = ItemService(FakeItems(ROWS))  # type: ignore[arg-type]

    claw = await service.search("cla")
    short = await service.search("c")

    assert [(item.label, item.any_version, item.item_ids) for item in claw.items] == [
        ("Hydra's claw", True, [22966])
    ]
    assert short.items == [] and short.ready


async def test_search_reports_when_the_list_was_never_downloaded() -> None:
    service = ItemService(FakeItems([], synced_at=None))  # type: ignore[arg-type]

    assert not (await service.search("claw")).ready


async def test_exact_names_give_every_id_of_any_version() -> None:
    service = ItemService(FakeItems(ROWS))  # type: ignore[arg-type]

    found = await service.ids_by_name(["bird  NEST", "Hydra's claw", "Hydras claw"])

    assert found == {"bird nest": [5070, 5074, 5075, 22798], "hydra's claw": [22966]}
    assert normalize_name("Hydras claw") not in found


async def test_sync_downloads_only_when_missing_or_older_than_a_week() -> None:
    client = AsyncMock()
    client.fetch_all.return_value = ROWS
    fresh = FakeItems([], synced_at=NOW - timedelta(days=2))
    stale = FakeItems([], synced_at=NOW - timedelta(days=8))
    never = FakeItems([], synced_at=None)

    assert await ItemService(fresh, client).sync_if_stale(NOW) is None  # type: ignore[arg-type]
    assert await ItemService(stale, client).sync_if_stale(NOW) == 6  # type: ignore[arg-type]
    assert await ItemService(never, client).sync_if_stale(NOW) == 6  # type: ignore[arg-type]
    assert never.synced == NOW and never.replaced is not None


async def test_the_wiki_list_is_read_page_by_page() -> None:
    offsets: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        query = request.url.params["query"]
        offsets.append(query.split(".offset(")[1].split(")")[0])
        rows = [{"item_name": "Logs", "item_id": ["1511"]}]
        return httpx.Response(200, json={"bucket": rows * (PAGE_SIZE if not offsets[1:] else 3)})

    rows = await WikiItemClient(httpx.MockTransport(handler)).fetch_all()

    assert offsets == ["0", str(PAGE_SIZE)]
    assert len(rows) == PAGE_SIZE + 3


@pytest.mark.parametrize(
    "response",
    [httpx.Response(500), httpx.Response(200, json={"error": "bad query"})],
)
async def test_wiki_errors_keep_the_last_list(response: httpx.Response) -> None:
    client = WikiItemClient(httpx.MockTransport(lambda request: response))

    with pytest.raises(WikiItemsError):
        await client.fetch_all()


async def test_only_one_instance_downloads_at_a_time() -> None:
    client = AsyncMock()
    client.fetch_all.return_value = ROWS
    items = FakeItems([], synced_at=None)
    items.synced = None

    first = await ItemService(items, client).sync_if_stale(NOW)  # type: ignore[arg-type]
    items.synced = None  # pretend the first download is still running
    second = await ItemService(items, client).sync_if_stale(NOW)  # type: ignore[arg-type]

    assert first == 6 and second is None
    assert client.fetch_all.await_count == 1
