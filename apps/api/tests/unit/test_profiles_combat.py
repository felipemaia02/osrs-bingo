from app.modules.profiles.combat import combat_level

MAXED = dict.fromkeys(
    ("attack", "strength", "defence", "hitpoints", "ranged", "prayer", "magic"), 99
)


def test_combat_level_follows_the_osrs_formula() -> None:
    assert combat_level(MAXED) == 126
    fresh = {**dict.fromkeys(MAXED, 1), "hitpoints": 10}
    assert combat_level(fresh) == 3
    # A pure ranger: ranged dominates melee.
    ranger = {**dict.fromkeys(MAXED, 1), "hitpoints": 99, "ranged": 99, "defence": 1}
    assert combat_level(ranger) == 73  # 0.25 * (1 + 99 + 0) + 0.325 * 148


def test_combat_level_needs_every_combat_skill() -> None:
    assert combat_level(None) is None
    assert combat_level({"attack": 99, "strength": 99}) is None
