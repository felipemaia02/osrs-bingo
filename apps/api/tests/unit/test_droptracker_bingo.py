from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.modules.droptracker.bingo import DropTrackerBingo, Outcome

START = datetime(2026, 10, 20, tzinfo=UTC)
EVENT = {
    "_id": ObjectId(),
    "status": "active",
    "start_at": START,
    "end_at": START + timedelta(days=14),
}
PLAYER = {
    "_id": ObjectId(),
    "user_id": ObjectId(),
    "team_id": ObjectId(),
    "display_name": "Hepo Lainen",
    "status": "approved",
}


def card(name: str, *drops: tuple[str, float, list[str]], position: int) -> dict[str, Any]:
    return {
        "position": position,
        "row": 1,
        "column": position,
        "card": {
            "card_id": f"card-{position}",
            "card_revision": 1,
            "name": name,
            "requires_preverification": False,
            "drops": [
                {
                    "key": item.lower().replace(" ", "-"),
                    "name": item,
                    "progress_weight": weight,
                    "aliases": aliases,
                }
                for item, weight, aliases in drops
            ],
        },
    }


BOARD = {
    "status": "published",
    "positions": [
        card(
            "Alchemical Hydra",
            ("Hydra's claw", 3, ["Hydras claw"]),
            ("Hydra leather", 1, []),
            position=1,
        ),
        card("Slayer Bosses", ("Hydra leather", 1, []), position=2),
        card("Barrows", ("Dharok's helm", 1, []), position=3),
        card("Skilling Tools", ("Dragon pickaxe", 2, []), position=4),
        card("Wilderness Trio", ("Dragon pickaxe", 2, []), position=5),
    ],
}


def drop(drop_id: int, item: str, npc: str = "Alchemical Hydra", **extra: Any) -> dict[str, Any]:
    return {
        "drop_id": drop_id,
        "player_name": "hepo_lainen",
        "npc_name": npc,
        "item_name": item,
        "quantity": 1,
        "received_at": START + timedelta(days=1),
        "image_url": "https://video.droptracker.io/claw.png",
        **extra,
    }


@pytest.fixture
def deps() -> dict[str, AsyncMock]:
    drops, events, players, boards, submissions = (AsyncMock() for _ in range(5))
    events.list.return_value = [EVENT]
    boards.get_by_event.return_value = BOARD
    players.approved_with_team.return_value = [PLAYER]
    submissions.has_recent_manual_drop.return_value = False
    submissions.insert.return_value = True
    return {
        "drops": drops,
        "events": events,
        "players": players,
        "boards": boards,
        "submissions": submissions,
    }


async def run(deps: dict[str, AsyncMock], *drops_: dict[str, Any]) -> dict[str, int]:
    deps["drops"].unprocessed.return_value = list(drops_)
    bingo = DropTrackerBingo(
        deps["drops"], deps["events"], deps["players"], deps["boards"], deps["submissions"]
    )
    return await bingo.process()


def inserted(deps: dict[str, AsyncMock]) -> list[dict[str, Any]]:
    return [call.args[0] for call in deps["submissions"].insert.await_args_list]


async def test_a_card_drop_from_an_event_player_becomes_a_pending_submission(deps) -> None:  # type: ignore[no-untyped-def]
    counts = await run(deps, drop(1, "Hydra's claw"))

    assert counts == {Outcome.CREATED: 1}
    [document] = inserted(deps)
    assert document["status"] == "pending" and document["source"] == "droptracker"
    assert document["position"] == 1 and document["drop_key"] == "hydra's-claw"
    assert document["progress_weight"] == 3 and document["droptracker_drop_id"] == 1
    assert document["screenshot_url"].endswith("claw.png")
    assert document["note"].startswith("Automatic · Alchemical Hydra · x1")
    deps["drops"].mark.assert_awaited_with(1, Outcome.CREATED, EVENT["_id"])


async def test_aliases_and_case_match_items(deps) -> None:  # type: ignore[no-untyped-def]
    assert await run(deps, drop(1, "HYDRAS CLAW")) == {Outcome.CREATED: 1}


async def test_alts_items_off_the_board_and_late_drops_create_nothing(deps) -> None:  # type: ignore[no-untyped-def]
    counts = await run(
        deps,
        drop(1, "Hydra's claw", player_name="Hepo Iron"),
        drop(2, "Bones"),
        drop(3, "Hydra's claw", received_at=START + timedelta(days=20)),
    )

    assert counts == {Outcome.NOT_IN_EVENT: 1, Outcome.NO_CARD: 1, Outcome.OUTSIDE_WINDOW: 1}
    deps["submissions"].insert.assert_not_awaited()


async def test_the_card_named_like_the_npc_wins_otherwise_every_card_is_queued(deps) -> None:  # type: ignore[no-untyped-def]
    await run(deps, drop(1, "Hydra leather", npc="Alchemical Hydra"))
    assert [doc["position"] for doc in inserted(deps)] == [1]

    deps["submissions"].insert.reset_mock()
    await run(deps, drop(2, "Dragon pickaxe", npc="Artio"))
    documents = inserted(deps)
    assert [doc["position"] for doc in documents] == [4, 5]
    assert "Also matches: Wilderness Trio" in documents[0]["note"]


async def test_a_recent_manual_submission_blocks_the_automatic_one(deps) -> None:  # type: ignore[no-untyped-def]
    deps["submissions"].has_recent_manual_drop.return_value = True

    assert await run(deps, drop(1, "Hydra's claw")) == {Outcome.MANUAL_DUPLICATE: 1}
    deps["submissions"].insert.assert_not_awaited()
    window = deps["submissions"].has_recent_manual_drop.await_args.args[5]
    assert window == timedelta(hours=24)


async def test_nothing_happens_without_an_active_event_or_published_board(deps) -> None:  # type: ignore[no-untyped-def]
    deps["events"].list.return_value = []
    assert await run(deps, drop(1, "Hydra's claw")) == {}
    deps["events"].list.return_value = [EVENT]
    deps["boards"].get_by_event.return_value = {**BOARD, "status": "draft"}
    assert await run(deps, drop(1, "Hydra's claw")) == {}
    deps["drops"].mark.assert_not_awaited()


def linked_board() -> dict[str, Any]:
    """Feature 033: drops linked to OSRS item IDs."""
    nests = card("Bird nests", ("Bird nest (seeds)", 1, []), position=1)
    nests["card"]["drops"][0].update(item_ids=[22798], match_by_name=False)
    logs = card("Woodcutting", ("Oak logs", 1, []), position=2)
    logs["card"]["drops"][0].update(item_ids=[1521], match_by_name=True)
    claw = card("Alchemical Hydra", ("Hydras Claw (typo)", 3, []), position=3)
    claw["card"]["drops"][0].update(item_ids=[22966], match_by_name=True)
    return {"status": "published", "positions": [nests, logs, claw]}


async def test_linked_drops_match_by_item_id_even_when_the_name_differs(deps) -> None:  # type: ignore[no-untyped-def]
    deps["boards"].get_by_event.return_value = linked_board()

    counts = await run(deps, drop(1, "Hydra's claw", item_id=22966))

    assert counts == {Outcome.CREATED: 1}
    assert inserted(deps)[0]["position"] == 3


async def test_any_version_drops_also_match_by_name_for_noted_items(deps) -> None:  # type: ignore[no-untyped-def]
    deps["boards"].get_by_event.return_value = linked_board()

    counts = await run(deps, drop(1, "Oak logs", npc="Tree", item_id=1522))

    assert counts == {Outcome.CREATED: 1}
    assert inserted(deps)[0]["position"] == 2


async def test_a_specific_version_ignores_other_items_with_the_same_name(deps) -> None:  # type: ignore[no-untyped-def]
    deps["boards"].get_by_event.return_value = linked_board()

    counts = await run(
        deps,
        drop(1, "Bird nest", npc="Tree", item_id=5074),
        drop(2, "Bird nest (seeds)", npc="Tree", item_id=5075),
        drop(3, "Bird nest", npc="Tree", item_id=22798),
    )

    assert counts == {Outcome.NO_CARD: 2, Outcome.CREATED: 1}
    [document] = inserted(deps)
    assert document["droptracker_drop_id"] == 3
