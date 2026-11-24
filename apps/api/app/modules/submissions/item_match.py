"""Finds the board tiles that accept an item by name (bot submissions, feature 072)."""

from dataclasses import dataclass
from typing import Any

from app.modules.items.names import normalize_name


@dataclass(frozen=True)
class ItemMatch:
    position: int
    card_name: str
    drop_key: str
    drop_name: str


def match_item(positions: list[dict[str, Any]], item: str) -> list[ItemMatch]:
    """Every square whose card accepts `item` by drop name or alias, in board order."""
    wanted = normalize_name(item)
    matches: list[ItemMatch] = []
    for slot in sorted(positions, key=lambda entry: entry["position"]):
        for drop in slot["card"].get("drops", []):
            names = {normalize_name(name) for name in (drop["name"], *drop.get("aliases", []))}
            if wanted in names:
                matches.append(
                    ItemMatch(slot["position"], slot["card"]["name"], drop["key"], drop["name"])
                )
                break
    return matches
