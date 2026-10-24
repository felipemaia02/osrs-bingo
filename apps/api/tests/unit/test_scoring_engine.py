from decimal import Decimal
from fractions import Fraction

from app.modules.scoring.engine import (
    AcceptedDrop,
    LineBonuses,
    Tile,
    competition_positions,
    contributions,
    decimal,
    score_team,
)

SA, ZA = "saradomin", "zamorak"


def grid(size: int, score: int = 10, requirement: int = 8) -> list[Tile]:
    return [
        Tile(
            position=(row - 1) * size + column,
            row=row,
            column=column,
            score=Decimal(score),
            requirement=Decimal(requirement),
        )
        for row in range(1, size + 1)
        for column in range(1, size + 1)
    ]


def drop(position: int, weight: float = 1, team: str = SA, player: str = "hal") -> AcceptedDrop:
    return AcceptedDrop(
        team_id=team,
        player_id=player,
        position=position,
        drop_key=f"item-{weight}",
        drop_name=f"Item {weight}",
        weight=decimal(weight),
        quantity=1,
    )


BONUSES = LineBonuses(row=25, column=30)


def test_partial_progress_awards_nothing_and_contribution_is_fractional() -> None:
    tiles = grid(6)
    score = score_team(SA, tiles, 6, [drop(1)], BONUSES)

    assert score.tiles[1].progress == 1 and not score.tiles[1].complete
    assert score.tiles[1].points == 0 and score.total == 0
    assert contributions(tiles, [drop(1)]) == {"hal": Fraction(5, 4)}


def test_tile_awards_its_score_once_at_or_above_the_requirement() -> None:
    tiles = grid(6)
    exact = score_team(SA, tiles, 6, [drop(1, 4), drop(1, 4)], BONUSES)
    above = score_team(SA, tiles, 6, [drop(1, 4), drop(1, 4), drop(1, 3)], BONUSES)

    assert exact.tiles[1].complete and exact.tile_points == 10
    assert above.tiles[1].progress == 11 and above.tile_points == 10
    assert above.tiles[1].drops["item-4"].count == 2
    assert above.tiles[1].drops["item-4"].progress == 8


def test_one_tile_can_complete_a_row_and_a_column_on_any_board_size() -> None:
    tiles = grid(3, requirement=1)
    first_row = [drop(position) for position in (1, 2, 3)]
    first_column = [drop(position) for position in (4, 7)]

    score = score_team(SA, tiles, 3, first_row + first_column, BONUSES)

    assert score.completed_rows == [1] and score.completed_columns == [1]
    assert score.completed_tiles == 5
    assert score.total == 5 * 10 + 25 + 30


def test_other_teams_drops_and_unknown_positions_are_ignored() -> None:
    tiles = grid(3, requirement=1)
    score = score_team(SA, tiles, 3, [drop(1, team=ZA), drop(99)], BONUSES)

    assert score.total == 0 and score.completed_tiles == 0


def test_events_without_rules_award_no_line_bonus() -> None:
    tiles = grid(3, requirement=1)
    row = [drop(position) for position in (1, 2, 3)]

    score = score_team(SA, tiles, 3, row, LineBonuses(row=None, column=None))

    assert score.completed_rows == [1] and score.row_points == 0 and score.total == 30


def test_contribution_keeps_counting_after_completion_and_stays_exact() -> None:
    tiles = grid(3, score=10, requirement=3)
    drops = [drop(1, player="hal"), drop(1, player="hal"), drop(1, player="pete"), drop(1)]

    totals = contributions(tiles, drops)

    assert totals["hal"] == Fraction(20, 3) + Fraction(10, 3)
    assert totals["pete"] == Fraction(10, 3)
    assert sum(totals.values()) == Fraction(40, 3)


def test_ties_share_the_position_and_skip_the_next() -> None:
    positions = competition_positions(
        [("sa", Decimal(167)), ("za", Decimal(142)), ("gu", Decimal(142)), ("ba", Decimal(98))]
    )

    assert positions == {"sa": (1, False), "za": (2, True), "gu": (2, True), "ba": (4, False)}


def test_decimal_keeps_short_float_values() -> None:
    assert decimal(0.1) + decimal(0.2) == Decimal("0.3")


def test_bonus_cards_score_on_their_own_and_never_complete_lines() -> None:
    bonus_row = [
        Tile(
            position=9 + slot,
            row=4,
            column=slot,
            score=Decimal(20),
            requirement=Decimal(1),
            bonus=True,
        )
        for slot in (1, 2, 3)
    ]
    tiles = [*grid(3, requirement=1), *bonus_row]
    first_row_and_bonus_row = [drop(position) for position in (1, 2, 3, 10, 11, 12)]

    score = score_team(SA, tiles, 3, first_row_and_bonus_row, BONUSES)

    assert score.completed_rows == [1] and score.completed_columns == []
    assert (score.completed_tiles, score.tile_points) == (3, 30)
    assert (score.completed_bonus, score.bonus_points) == (3, 60)
    assert score.total == 30 + 25 + 60
