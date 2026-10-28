import pytest

from app.modules.balance.kc import RAIDS, split_kc
from app.modules.balance.schemas import BossKcSettingsUpdate
from app.modules.profiles.wom import parse_player

BOSSES = {"brutus": 3000, "vorkath": 1500, "zulrah": 500, "chambers_of_xeric": 400}


def test_excluded_bosses_leave_the_total_and_raids_count_apart() -> None:
    assert split_kc(BOSSES, 5400, ["brutus"]) == (2000, 400)
    assert split_kc(BOSSES, 5400, []) == (5000, 400)
    assert split_kc(BOSSES, 5400, ["brutus", "chambers_of_xeric"]) == (2000, 0)


def test_accounts_without_per_boss_kc_count_their_total_as_boss_kc() -> None:
    assert split_kc(None, 5400, ["brutus"]) == (5400, 0)
    assert split_kc(None, None, []) == (0, 0)


def test_wom_reads_keep_each_boss_with_kills() -> None:
    stats = parse_player(
        {
            "displayName": "Zezima",
            "latestSnapshot": {
                "data": {
                    "skills": {},
                    "bosses": {"zulrah": {"kills": 500}, "obor": {"kills": -1}, "tempo": {}},
                }
            },
        }
    )
    assert stats.bosses == {"zulrah": 500}
    assert "tombs_of_amascut_expert" in RAIDS


def test_settings_accept_only_wom_boss_names_once() -> None:
    assert BossKcSettingsUpdate(excluded=["brutus", "brutus", "obor"]).excluded == [
        "brutus",
        "obor",
    ]
    with pytest.raises(ValueError):
        BossKcSettingsUpdate(excluded=["Brutus!"])
