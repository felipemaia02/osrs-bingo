"""Progression tier (feature 069): early, mid or end game, suggested from the main's WOM stats."""

from collections.abc import Mapping, Sequence
from typing import Any

from app.modules.profiles.schemas import ProgressionTier, TierInfo, WomStatus

END_GAME_TOTAL_LEVEL = 2000
END_GAME_EHB = 300
MID_GAME_TOTAL_LEVEL = 1750
MID_GAME_EHB = 75


def _reaches(level: int | None, ehb: float | None, min_level: int, min_ehb: float) -> bool:
    return (level is not None and level >= min_level) or (ehb is not None and ehb >= min_ehb)


def suggest_tier(accounts: Sequence[Mapping[str, Any]]) -> ProgressionTier | None:
    """From the main account only (BR-002); None without WOM data (EC-002)."""
    main = next((account for account in accounts if account.get("is_main")), None)
    if main is None or main.get("wom_status") == WomStatus.NOT_FOUND:
        return None
    level, ehb = main.get("total_level"), main.get("ehb")
    if level is None and ehb is None:
        return None
    if _reaches(level, ehb, END_GAME_TOTAL_LEVEL, END_GAME_EHB):
        return ProgressionTier.END
    if _reaches(level, ehb, MID_GAME_TOTAL_LEVEL, MID_GAME_EHB):
        return ProgressionTier.MID
    return ProgressionTier.EARLY


def tier_info(
    accounts: Sequence[Mapping[str, Any]], override: Mapping[str, Any] | None
) -> TierInfo:
    suggested = suggest_tier(accounts)
    overridden = ProgressionTier(override["tier"]) if override and override.get("tier") else None
    return TierInfo(
        tier=overridden or suggested,
        tier_suggested=suggested,
        tier_overridden=overridden is not None,
    )
