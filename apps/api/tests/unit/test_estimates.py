"""Drop rates and expected time to completion (feature 060)."""

import json
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import Settings
from app.core.exceptions import AppException
from app.modules.profiles.wom import WomClient, WomUnavailableError
from app.modules.scoring.estimate_service import EstimatePreview, EstimateService
from app.modules.scoring.estimates import (
    DropChance,
    chance_per_kill,
    estimate,
    suggested_kills_per_hour,
)
from app.modules.scoring.wiki_rates import WikiDropRateClient
from app.modules.tiles.schemas import CardRevisionResponse
from tests.unit.test_scoring_service import EVENT_ID, USER, deps  # noqa: F401

# The spreadsheet's Mad Angel example: 6 points needed.
MAD_ANGEL = [
    DropChance(chance=Decimal(1) / 127, weight=Decimal(1)),
    DropChance(chance=Decimal(1) / 1000, weight=Decimal(2)),
    DropChance(chance=Decimal(1) / 2000, weight=Decimal(3)),
]


def test_spreadsheet_example_for_the_whole_tile() -> None:
    result = estimate(Decimal(6), MAD_ANGEL, Decimal(40))

    assert (result.kills, result.hours, result.drops_without_rate) == (528, 13.2, 0)


def test_what_is_left_for_a_team_halfway() -> None:
    result = estimate(Decimal(3), MAD_ANGEL, Decimal(40))

    assert (result.kills, result.hours) == (264, 6.6)


def test_unknown_rates_and_kills_per_hour_are_never_shown_as_zero() -> None:
    no_rates = estimate(Decimal(6), [DropChance(chance=None, weight=Decimal(1))], Decimal(40))
    assert (no_rates.kills, no_rates.hours, no_rates.drops_without_rate) == (None, None, 1)

    partial = estimate(Decimal(6), [*MAD_ANGEL, DropChance(None, Decimal(5))], None)
    assert (partial.kills, partial.hours, partial.drops_without_rate) == (528, None, 1)


@pytest.mark.parametrize(
    ("rate", "chance"),
    [
        ("1/127", Decimal(1) / 127),
        ("1/1,000", Decimal(1) / 1000),
        ("14/60", Decimal(14) / 60),
        ("~1/25.6", Decimal(1) / Decimal("25.6")),
        ("Always", Decimal(1)),
        ("0.0125", Decimal("0.0125")),
        ("Varies", None),
        ("", None),
        (None, None),
        ("3/2", None),
        ("1/0", None),
    ],
)
def test_rates_are_read_as_the_wiki_writes_them(rate: str | None, chance: Decimal | None) -> None:
    assert chance_per_kill(rate) == chance


def test_wom_ironman_rate_suggests_80_percent() -> None:
    assert suggested_kills_per_hour(50) == 40
    assert suggested_kills_per_hour(54) == 43.2


def card_revision(**changes: Any) -> CardRevisionResponse:
    fields: dict[str, Any] = {
        "name": "Mad Angel",
        "kind": "boss",
        "difficulty": "High",
        "tile_score": 20,
        "completion_requirement": 6,
        "drops": [
            {"key": "hallowfell", "name": "Hallowfell", "progress_weight": 1, "drop_rate": "1/127"},
            {"key": "jar", "name": "Jar of Light", "progress_weight": 2, "drop_rate": "1/1,000"},
            {"key": "aggy", "name": "Aggy", "progress_weight": 3, "drop_rate": " 1/2000 "},
        ],
        "fallback_image_accepted": True,
        "kills_per_hour": 40,
        "ehb_boss": "mad_angel",
        "revision": 1,
        "provenance": {"source": "admin"},
        "change_reason": "Created",
        "created_by": "admin",
        "created_at": "2026-11-04T12:00:00Z",
        **changes,
    }
    return CardRevisionResponse.model_validate(fields)


def test_card_revisions_carry_their_estimate() -> None:
    dumped = card_revision().model_dump()

    assert dumped["estimate"] == {"kills": 528, "hours": 13.2, "drops_without_rate": 0}
    assert dumped["drops"][0]["drop_rate"] == "1/127"
    assert dumped["drops"][2]["drop_rate"] == "1/2000"


async def test_team_tiles_show_what_is_left_until_complete(deps: dict[str, Any]) -> None:  # noqa: F811
    board = deps["boards"].get_by_event.return_value
    for item in board["positions"]:
        item["card"]["drops"][0]["drop_rate"] = "1/10"  # "unique", weight 1
        item["card"]["kills_per_hour"] = 20

    score = await deps["service"].own_team(str(EVENT_ID), USER)

    done, open_tile = score.tiles[0], score.tiles[3]
    assert done.complete and done.remaining_estimate is None
    # 2 progress needed at 1/10 per kill → 20 kills, 1 hour.
    assert open_tile.remaining_estimate is not None
    assert (open_tile.remaining_estimate.kills, open_tile.remaining_estimate.hours) == (20, 1.0)
    assert open_tile.remaining_estimate.drops_without_rate == 1


def wom(handler: Any) -> WomClient:
    return WomClient(Settings(), transport=httpx.MockTransport(handler))


async def test_ehb_rates_come_from_wom_ironman_and_are_cached() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(
            200, json=[{"boss": "cerberus", "rate": 54}, {"boss": "bryophyta", "rate": 0}]
        )

    service = EstimateService(wom(handler))

    rates = await service.ehb_rates()
    await service.ehb_rates()

    assert len(calls) == 1
    assert calls[0].url.params["type"] == "ironman" and calls[0].url.params["metric"] == "ehb"
    assert [(rate.boss, rate.label, rate.suggested_kills_per_hour) for rate in rates] == [
        ("cerberus", "Cerberus", 43.2)
    ]


async def test_wom_down_gives_a_clear_error() -> None:
    client = AsyncMock(spec=WomClient)
    client.ironman_ehb_rates.side_effect = WomUnavailableError("timeout")

    with pytest.raises(AppException, match="type the kills per hour by hand") as caught:
        await EstimateService(client).ehb_rates()
    assert caught.value.status_code == 502


def test_preview_accepts_half_filled_drop_rows() -> None:
    preview = EstimatePreview.model_validate(
        {
            "completion_requirement": 6,
            "drops": [
                {"name": "", "progress_weight": 1, "drop_rate": "1/127"},
                {"progress_weight": 2, "drop_rate": "1/1,000"},
                {"progress_weight": 3, "drop_rate": "1/2000"},
            ],
            "kills_per_hour": 40,
        }
    )

    assert EstimateService.preview(preview).kills == 528


async def test_find_on_wom_matches_the_card_name_with_or_without_the() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json=[{"boss": "the_hueycoatl", "rate": 9}, {"boss": "phantom_muspah", "rate": 27}]
        )

    service = EstimateService(wom(handler))

    assert (await service.match("Hueycoatl")).suggested_kills_per_hour == 7.2
    assert (await service.match("Phantom Muspah")).boss == "phantom_muspah"
    with pytest.raises(AppException) as caught:
        await service.match("God Wars Dungeon")
    assert caught.value.status_code == 404


def wiki_line(item: str, source: str, rarity: str) -> dict[str, str]:
    return {
        "item_name": item,
        "drop_json": json.dumps({"Dropped from": source, "Rarity": rarity}),
    }


def wiki(
    rows: list[dict[str, str]], calls: list[httpx.Request] | None = None
) -> WikiDropRateClient:
    def handler(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(request)
        return httpx.Response(200, json={"bucket": rows})

    return WikiDropRateClient(transport=httpx.MockTransport(handler))


async def test_import_from_wiki_uses_the_cards_own_source_in_one_request() -> None:
    calls: list[httpx.Request] = []
    client = wiki(
        [
            wiki_line("Tormented synapse", "Tormented Demon", "1/500"),
            wiki_line("Hydra's claw", "Alchemical Hydra", "1/1,001"),
            wiki_line("Shared item", "Tormented Demon", "1/50"),
            wiki_line("Shared item", "Other boss", "1/10"),
        ],
        calls,
    )

    rates = await EstimateService(AsyncMock(spec=WomClient), client).wiki_rates(
        "Tormented Demons", ["Tormented synapse", "Shared item", "Hydra's claw", "Unknown"]
    )

    assert [(rate.name, rate.rate) for rate in rates] == [
        ("Tormented synapse", "1/500"),
        ("Shared item", "1/50"),
        # Another source, but the only one there is: its rarity is used.
        ("Hydra's claw", "1/1,001"),
        ("Unknown", None),
    ]
    assert rates[3].sources == []
    assert len(calls) == 1
    assert "{'item_name','Hydra\\'s claw'}" in calls[0].url.params["query"]


async def test_import_from_wiki_leaves_ambiguous_sources_to_the_admin() -> None:
    client = wiki(
        [
            wiki_line("Twisted bow", "Ancient chest#Normal Mode", "2/60"),
            wiki_line("Twisted bow", "Ancient chest#Challenge Mode", "2/56"),
        ]
    )

    (rate,) = await EstimateService(AsyncMock(spec=WomClient), client).wiki_rates(
        "Chambers of Xeric", ["Twisted bow"]
    )

    assert rate.rate is None
    assert [(item.source, item.rarity) for item in rate.sources] == [
        ("Ancient chest#Normal Mode", "2/60"),
        ("Ancient chest#Challenge Mode", "2/56"),
    ]


async def test_wiki_down_gives_a_clear_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    client = WikiDropRateClient(transport=httpx.MockTransport(handler))
    with pytest.raises(AppException, match="type the drop rates by hand") as caught:
        await EstimateService(AsyncMock(spec=WomClient), client).wiki_rates("Vorkath", ["x"])
    assert caught.value.status_code == 502
