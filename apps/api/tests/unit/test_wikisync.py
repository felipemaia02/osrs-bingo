from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.modules.items.quests import parse_quest_points
from app.modules.profiles.schemas import AccountAdd
from app.modules.profiles.service import ProfileService
from app.modules.profiles.wikisync import (
    WikiSyncClient,
    WikiSyncData,
    WikiSyncUnavailableError,
    parse_player,
    stored,
    summary,
)
from tests.unit.test_profiles_service import USER, FakeProfiles, stats

NOW = datetime(2026, 10, 25, tzinfo=UTC)
BODY: dict[str, Any] = {
    "quests": {".": 0, "Cook's Assistant": 2, "Dragon Slayer I": 1, "Mage Arena I": 2},
    "achievement_diaries": {
        "Karamja": {"Easy": {"complete": True}, "Hard": {"complete": True}},
        "Ardougne": {"Easy": {"complete": True}, "Hard": {"complete": False}},
    },
}
QUEST_TABLE = """
<table><tr><th>#</th><th>Name</th><th>Difficulty</th><th>Length</th><th><img></th></tr>
<tr><td>1</td><td><a>Cook's Assistant</a></td><td>Novice</td><td>Short</td><td>1</td></tr>
<tr><td>2</td><td>Dragon Slayer I</td><td>Experienced</td><td>Long</td><td>2</td></tr>
<tr><td>100</td><td>Recipe for Disaster</td><td>Special</td><td>Very Long</td><td>10</td></tr>
<tr><td>100.1</td><td>Recipe for Disaster/Part one</td><td>N</td><td>S</td><td>1</td></tr>
</table>
<table><tr><th>Skill</th></tr><tr><td>Attack</td></tr></table>
"""


def test_quest_tables_give_points_per_quest_without_quest_parts() -> None:
    assert parse_quest_points(QUEST_TABLE) == {
        "Cook's Assistant": 1,
        "Dragon Slayer I": 2,
        "Recipe for Disaster": 10,
    }


def test_wikisync_answers_become_quests_and_diary_tiers() -> None:
    data = parse_player(BODY)

    assert data.completed_quests == ["Cook's Assistant", "Mage Arena I"]
    assert data.quests_total == 3
    assert data.diaries["Karamja"] == {"easy": True, "medium": False, "hard": True, "elite": False}


def test_quest_points_count_only_real_quests_from_the_wiki_table() -> None:
    points = {"cook's assistant": 1, "dragon slayer i": 2}

    result = summary(stored(parse_player(BODY), points, NOW))

    assert result is not None
    assert (result.quest_points, result.quests_completed, result.quests_total) == (1, 1, 2)
    assert result.hard_diaries == 1
    assert [region.region for region in result.diaries] == ["Ardougne", "Karamja"]
    without_table = summary(stored(parse_player(BODY), {}, NOW))
    assert without_table is not None and without_table.quest_points is None


@pytest.mark.parametrize(
    ("response", "expected"),
    [
        (httpx.Response(400, json={"code": "NO_USER_DATA", "error": "No user data found."}), None),
        (httpx.Response(200, json=BODY), "data"),
    ],
)
async def test_client_reads_players_and_players_without_the_plugin(
    response: httpx.Response, expected: str | None
) -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(str(request.url))
        return response

    result = await WikiSyncClient(httpx.MockTransport(handler)).player("Holy Hal")

    assert seen == ["https://sync.runescape.wiki/runelite/player/Holy%20Hal/STANDARD"]
    assert (result is None) if expected is None else isinstance(result, WikiSyncData)


async def test_client_errors_mean_wikisync_is_unavailable() -> None:
    client = WikiSyncClient(httpx.MockTransport(lambda request: httpx.Response(502)))

    with pytest.raises(WikiSyncUnavailableError):
        await client.player("Holy Hal")


def service(profiles: FakeProfiles, wikisync: AsyncMock) -> ProfileService:
    wom = AsyncMock()
    wom.player.return_value = wom.track.return_value = stats()

    async def points() -> dict[str, int]:
        return {"cook's assistant": 1}

    return ProfileService(profiles, wom, wikisync, points)  # type: ignore[arg-type]


async def test_adding_an_account_reads_quests_and_diaries() -> None:
    wikisync = AsyncMock()
    wikisync.player.return_value = parse_player(BODY)

    profile = await service(FakeProfiles(), wikisync).add_account(USER, AccountAdd(rsn="Main"))

    data = profile.accounts[0].wikisync
    assert data is not None and data.status == "found" and data.quest_points == 1


async def test_wikisync_failures_keep_the_last_data_and_never_block_wom() -> None:
    profiles = FakeProfiles()
    wikisync = AsyncMock()
    wikisync.player.return_value = parse_player(BODY)
    profile = await service(profiles, wikisync).add_account(USER, AccountAdd(rsn="Main"))
    profiles.document["accounts"][0]["checked_at"] = None  # allow the refresh right away

    wikisync.player.side_effect = WikiSyncUnavailableError("down")
    refreshed = await service(profiles, wikisync).refresh(USER, profile.accounts[0].id)

    data = refreshed.accounts[0].wikisync
    assert data is not None and data.status == "found" and data.quest_points == 1
    assert refreshed.accounts[0].wom_status == "found"


async def test_players_without_the_plugin_are_marked_not_found() -> None:
    wikisync = AsyncMock()
    wikisync.player.return_value = None

    profile = await service(FakeProfiles(), wikisync).add_account(USER, AccountAdd(rsn="Main"))

    data = profile.accounts[0].wikisync
    assert data is not None and data.status == "not_found" and data.quest_points is None
