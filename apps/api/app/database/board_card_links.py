from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def relink_orphaned_board_cards(db: AsyncIOMotorDatabase) -> int:  # type: ignore[type-arg]
    """Point board squares whose card no longer exists at the catalog card with the same slug.

    A catalog re-import creates cards with new ids; without this the live board could never
    pick up their revisions. The snapshot itself (and its revision) is left untouched.
    """
    catalog = {
        card["slug"]: str(card["_id"]) async for card in db["tile_cards"].find({}, {"slug": 1})
    }
    known_ids = set(catalog.values())
    relinked = 0
    async for board in db["event_boards"].find({}, {"positions": 1}):
        changes = _relinks(board.get("positions") or [], catalog, known_ids)
        if changes:
            await db["event_boards"].update_one({"_id": board["_id"]}, {"$set": changes})
            relinked += len(changes)
    return relinked


def _relinks(
    positions: list[dict[str, Any]], catalog: dict[str, str], known_ids: set[str]
) -> dict[str, str]:
    changes: dict[str, str] = {}
    for index, position in enumerate(positions):
        card = position.get("card")
        if not card or card.get("card_id") in known_ids:
            continue
        current_id = catalog.get(card.get("slug", ""))
        if current_id:
            changes[f"positions.{index}.card.card_id"] = current_id
    return changes
