"""OSRS combat level from the 7 combat skills (feature 024 revision)."""

import math

from app.modules.profiles.schemas import COMBAT_SKILLS

BASE_FACTOR = 0.25
STYLE_FACTOR = 0.325
RANGED_MAGIC_MULTIPLIER = 1.5


def combat_level(skills: dict[str, int] | None) -> int | None:
    """The in-game formula; None until every combat skill is known."""
    if not skills or any(not skills.get(skill) for skill in COMBAT_SKILLS):
        return None
    base = BASE_FACTOR * (skills["defence"] + skills["hitpoints"] + skills["prayer"] // 2)
    melee = STYLE_FACTOR * (skills["attack"] + skills["strength"])
    ranged = STYLE_FACTOR * math.floor(skills["ranged"] * RANGED_MAGIC_MULTIPLIER)
    magic = STYLE_FACTOR * math.floor(skills["magic"] * RANGED_MAGIC_MULTIPLIER)
    return math.floor(base + max(melee, ranged, magic))
