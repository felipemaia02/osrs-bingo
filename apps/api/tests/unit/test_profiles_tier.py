import pytest

from app.modules.profiles.schemas import ProgressionTier
from app.modules.profiles.tier import suggest_tier, tier_info


def main(total_level: int | None, ehb: float | None, wom_status: str = "found") -> dict:
    return {"is_main": True, "wom_status": wom_status, "total_level": total_level, "ehb": ehb}


@pytest.mark.parametrize(
    ("total_level", "ehb", "expected"),
    [
        (2200, 10, ProgressionTier.END),
        (1500, 300, ProgressionTier.END),
        (2000, 0, ProgressionTier.END),
        (1999, 0, ProgressionTier.MID),
        (1750, None, ProgressionTier.MID),
        (1200, 75, ProgressionTier.MID),
        (1749, 74.9, ProgressionTier.EARLY),
        (None, 5, ProgressionTier.EARLY),
    ],
)
def test_tier_comes_from_the_main_total_level_or_ehb(
    total_level: int | None, ehb: float | None, expected: ProgressionTier
) -> None:
    assert suggest_tier([main(total_level, ehb)]) is expected


def test_alts_do_not_count_and_missing_wom_data_is_unknown() -> None:
    alt = {"is_main": False, "wom_status": "found", "total_level": 2277, "ehb": 900}
    assert suggest_tier([main(1000, 0), alt]) is ProgressionTier.EARLY
    assert suggest_tier([alt]) is None
    assert suggest_tier([main(2277, 900, wom_status="not_found")]) is None
    assert suggest_tier([main(None, None)]) is None


def test_an_admin_override_wins_and_keeps_the_suggestion() -> None:
    info = tier_info([main(1800, 0)], {"tier": "end"})
    assert (info.tier, info.tier_suggested, info.tier_overridden) == (
        ProgressionTier.END,
        ProgressionTier.MID,
        True,
    )
    plain = tier_info([main(1800, 0)], None)
    assert (plain.tier, plain.tier_overridden) == (ProgressionTier.MID, False)
