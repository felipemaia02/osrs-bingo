import json

import httpx
import pytest

from app.core.config import Settings
from app.modules.profiles.wom import WomClient, WomUnavailableError, parse_player

PLAYER = {
    "displayName": "Zezima",
    "ehp": 812.5,
    "ehb": 140.25,
    "updatedAt": "2026-10-20T12:00:00.000Z",
    "latestSnapshot": {
        "data": {
            "skills": {
                "overall": {"level": 2277},
                "attack": {"level": 99},
                "strength": {"level": 99},
                "defence": {"level": 90},
                "hitpoints": {"level": 99},
                "ranged": {"level": 95},
                "prayer": {"level": 77},
                "magic": {"level": 94},
                "slayer": {"level": 96},
                "agility": {"level": 87},
            },
            "bosses": {"zulrah": {"kills": 500}, "vorkath": {"kills": 120}, "obor": {"kills": -1}},
        }
    },
}


def client_for(handler) -> WomClient:  # type: ignore[no-untyped-def]
    return WomClient(Settings(), transport=httpx.MockTransport(handler))


def test_parses_totals_and_ignores_unranked_bosses() -> None:
    stats = parse_player(PLAYER)

    assert stats.display_name == "Zezima"
    assert stats.total_level == 2277
    assert stats.boss_kc == 620
    assert stats.combat == {
        "attack": 99,
        "strength": 99,
        "defence": 90,
        "hitpoints": 99,
        "ranged": 95,
        "prayer": 77,
        "magic": 94,
    }
    assert stats.skills["slayer"] == 96 and stats.skills["agility"] == 87
    assert stats.skills["attack"] == 99 and "overall" not in stats.skills
    assert stats.ehb == 140.25
    assert stats.updated_at is not None and stats.updated_at.tzinfo is not None


async def test_reads_a_player_with_the_user_agent() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=PLAYER)

    stats = await client_for(handler).player("Zezima")

    assert stats is not None and stats.boss_kc == 620
    assert seen[0].method == "GET" and seen[0].url.path.endswith("/players/Zezima")
    assert "osrs-bingo" in seen[0].headers["user-agent"]


@pytest.mark.parametrize(
    ("status", "body"),
    [
        (404, {"code": "PLAYER_NOT_FOUND"}),
        (400, {"code": "HISCORES_USERNAME_NOT_FOUND"}),
        (400, {"code": "INVALID_USERNAME"}),
    ],
)
async def test_unknown_players_are_not_found(status: int, body: dict[str, str]) -> None:
    client = client_for(lambda _: httpx.Response(status, content=json.dumps(body)))

    assert await client.track("Nobody") is None


@pytest.mark.parametrize("status", [400, 429, 500, 503])
async def test_other_errors_mean_wom_is_unavailable(status: int) -> None:
    client = client_for(lambda _: httpx.Response(status, json={"code": "RATE_LIMITED"}))

    with pytest.raises(WomUnavailableError):
        await client.player("Zezima")


async def test_network_errors_mean_wom_is_unavailable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("slow", request=request)

    with pytest.raises(WomUnavailableError):
        await client_for(handler).player("Zezima")


def test_new_accounts_without_a_snapshot_have_zero_levels() -> None:
    stats = parse_player({"displayName": "Fresh", "latestSnapshot": None})

    assert stats.total_level == 0 and stats.boss_kc == 0
    assert set(stats.combat.values()) == {0}
    assert stats.skills == {}
