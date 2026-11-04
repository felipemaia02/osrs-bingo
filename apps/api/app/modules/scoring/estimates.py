"""Expected kills and time to finish a tile (feature 060), as in the bingo spreadsheet.

points per kill = sum over drops with a rate of (1 / rate) * progress weight
expected kills  = progress still needed / points per kill
expected hours  = expected kills / kills per hour

An average, not a guarantee: dry streaks take longer and the last drop often overshoots."""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from pydantic import BaseModel

# Kills per hour suggested from WOM: 80 % of the ironman EHB rate.
IRONMAN_KPH_FACTOR = Decimal("0.8")
HOURS_DECIMALS = 1


@dataclass(frozen=True)
class DropChance:
    """`rate` is X in "1 / X"; None when the admin didn't set it."""

    rate: Decimal | None
    weight: Decimal


class Estimate(BaseModel):
    kills: int | None
    hours: float | None
    drops_without_rate: int


def suggested_kills_per_hour(ironman_rate: float) -> float:
    return float(round(Decimal(str(ironman_rate)) * IRONMAN_KPH_FACTOR, HOURS_DECIMALS))


def estimate(
    needed: Decimal, drops: Iterable[DropChance], kills_per_hour: Decimal | None
) -> Estimate:
    chances = list(drops)
    rated = [drop for drop in chances if drop.rate]
    points_per_kill = sum((drop.weight / drop.rate for drop in rated if drop.rate), Decimal(0))
    missing = len(chances) - len(rated)
    if needed <= 0:
        return Estimate(kills=0, hours=0.0, drops_without_rate=missing)
    if not points_per_kill:
        return Estimate(kills=None, hours=None, drops_without_rate=missing)
    kills = needed / points_per_kill
    hours = round(float(kills / kills_per_hour), HOURS_DECIMALS) if kills_per_hour else None
    return Estimate(kills=round(kills), hours=hours, drops_without_rate=missing)


def card_estimate(card: dict[str, Any], needed: Decimal) -> Estimate:
    """Estimate from a card revision or board snapshot (as stored or dumped)."""
    kph = card.get("kills_per_hour")
    return estimate(
        needed,
        (
            DropChance(
                rate=Decimal(str(drop["drop_rate"])) if drop.get("drop_rate") else None,
                weight=Decimal(str(drop["progress_weight"])),
            )
            for drop in card.get("drops") or []
        ),
        Decimal(str(kph)) if kph else None,
    )
