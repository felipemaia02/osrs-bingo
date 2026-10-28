"""Boss KC rules for team balance (feature 039): raids apart, some bosses not counted."""

from collections.abc import Iterable, Mapping
from typing import Any

# Wise Old Man's raid entries; their KC is shown as "Raids KC", apart from other bosses.
RAIDS = (
    "chambers_of_xeric",
    "chambers_of_xeric_challenge_mode",
    "theatre_of_blood",
    "theatre_of_blood_hard_mode",
    "tombs_of_amascut",
    "tombs_of_amascut_expert",
)
# Easy, high-volume bosses that would inflate boss KC; admins can change the list.
DEFAULT_EXCLUDED = ("brutus",)


def split_kc(
    bosses: Mapping[str, int] | None, total: int | None, excluded: Iterable[str]
) -> tuple[int, int]:
    """(boss KC, raids KC) of one account. Accounts read before per-boss KC existed only
    have the total: it all counts as boss KC until they're read again."""
    if bosses is None:
        return int(total or 0), 0
    skip = set(excluded)
    boss = sum(kills for name, kills in bosses.items() if name not in skip and name not in RAIDS)
    raids = sum(kills for name, kills in bosses.items() if name in RAIDS and name not in skip)
    return boss, raids


def kc_expression(account: str, excluded: list[str]) -> dict[str, Any]:
    """MongoDB expression for one account's {boss, raids} KC, same rule as `split_kc`."""
    entries = {"$objectToArray": {"$ifNull": [f"{account}.bosses", {}]}}

    def total(condition: dict[str, Any]) -> dict[str, Any]:
        return {
            "$sum": {
                "$map": {
                    "input": {"$filter": {"input": entries, "as": "boss", "cond": condition}},
                    "as": "boss",
                    "in": "$$boss.v",
                }
            }
        }

    raid = {"$in": ["$$boss.k", list(RAIDS)]}
    counted = {"$not": [{"$in": ["$$boss.k", excluded]}]}
    has_bosses = {"$ne": [{"$type": f"{account}.bosses"}, "missing"]}
    return {
        "boss": {
            "$cond": [
                has_bosses,
                total({"$and": [counted, {"$not": [raid]}]}),
                {"$ifNull": [f"{account}.boss_kc", 0]},
            ]
        },
        "raids": {"$cond": [has_bosses, total({"$and": [counted, raid]}), 0]},
    }
