"""Expected kills and time to finish a tile (feature 060), as in the bingo spreadsheet.

points per kill = sum over drops with a rate of chance per kill * progress weight
expected kills  = progress still needed / points per kill
expected hours  = expected kills / kills per hour

An average, not a guarantee: dry streaks take longer and the last drop often overshoots."""

import re
from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import BaseModel

# Kills per hour suggested from WOM: 80 % of the ironman EHB rate.
IRONMAN_KPH_FACTOR = Decimal("0.8")
HOURS_DECIMALS = 1


RATE_PATTERN = re.compile(r"^~?\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)$")
ALWAYS = "always"
RATE_MAX_LENGTH = 40


def chance_per_kill(rate: str | None) -> Decimal | None:
    """A rate as the OSRS Wiki writes it ("1/127", "1/1,000", "~1/25.6", "Always") or a
    decimal chance ("0.0125"); None when it can't be read (feature 060 rev 1)."""
    text = (rate or "").replace(",", "").strip().lower()
    if text == ALWAYS:
        return Decimal(1)
    match = RATE_PATTERN.match(text)
    try:
        if match:
            numerator, denominator = Decimal(match[1]), Decimal(match[2])
            chance = numerator / denominator if denominator else None
        else:
            chance = Decimal(text) if text else None
    except InvalidOperation:
        return None
    return chance if chance is not None and 0 < chance <= 1 else None


@dataclass(frozen=True)
class DropChance:
    """`chance` per kill; None when the rate is unknown."""

    chance: Decimal | None
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
    rated = [drop for drop in chances if drop.chance]
    points_per_kill = sum((drop.weight * drop.chance for drop in rated if drop.chance), Decimal(0))
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
                chance=chance_per_kill(drop.get("drop_rate")),
                weight=Decimal(str(drop["progress_weight"])),
            )
            for drop in card.get("drops") or []
        ),
        Decimal(str(kph)) if kph else None,
    )
