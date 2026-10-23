"""Bingo scoring rules (feature 006). Pure functions over plain inputs, exact decimals.

- Tile progress = sum of weight * quantity of the team's accepted drops on that tile.
- A tile is complete when progress >= requirement and awards its score once.
- A row/column is complete when all of its `size` tiles are complete.
- Team total = tile points + completed rows * row bonus + completed columns * column bonus.
- Individual contribution = weight * quantity / requirement * tile score per accepted drop
  (it keeps counting after completion and never adds to the team total).
"""

from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from decimal import Decimal
from fractions import Fraction

ZERO = Decimal(0)


def decimal(value: float | int | str | Decimal) -> Decimal:
    """Floats from storage go through their shortest repr so 0.1 stays 0.1."""
    return value if isinstance(value, Decimal) else Decimal(str(value))


@dataclass(frozen=True)
class Tile:
    position: int
    row: int
    column: int
    score: Decimal
    requirement: Decimal


@dataclass(frozen=True)
class AcceptedDrop:
    team_id: str
    player_id: str
    position: int
    drop_key: str
    drop_name: str
    weight: Decimal
    quantity: int


@dataclass(frozen=True)
class LineBonuses:
    """None means the event has no rules (activated before feature 006): counts as 0."""

    row: int | None
    column: int | None


@dataclass
class DropCount:
    drop_key: str
    drop_name: str
    count: int = 0
    progress: Decimal = ZERO


@dataclass
class TileResult:
    tile: Tile
    progress: Decimal = ZERO
    drops: dict[str, DropCount] = field(default_factory=dict)

    @property
    def complete(self) -> bool:
        return self.progress >= self.tile.requirement

    @property
    def points(self) -> Decimal:
        return self.tile.score if self.complete else ZERO


@dataclass
class TeamScore:
    team_id: str
    tiles: dict[int, TileResult]
    completed_rows: list[int]
    completed_columns: list[int]
    row_points: Decimal
    column_points: Decimal

    @property
    def completed_tiles(self) -> int:
        return sum(1 for result in self.tiles.values() if result.complete)

    @property
    def tile_points(self) -> Decimal:
        return sum((result.points for result in self.tiles.values()), ZERO)

    @property
    def total(self) -> Decimal:
        return self.tile_points + self.row_points + self.column_points


def score_team(
    team_id: str,
    tiles: Sequence[Tile],
    size: int,
    drops: Iterable[AcceptedDrop],
    bonuses: LineBonuses,
) -> TeamScore:
    results = {tile.position: TileResult(tile) for tile in tiles}
    for drop in drops:
        result = results.get(drop.position)
        if drop.team_id != team_id or result is None:
            continue
        progress = drop.weight * drop.quantity
        result.progress += progress
        count = result.drops.setdefault(drop.drop_key, DropCount(drop.drop_key, drop.drop_name))
        count.count += drop.quantity
        count.progress += progress

    def complete_lines(axis: str) -> list[int]:
        by_line: dict[int, list[bool]] = defaultdict(list)
        for result in results.values():
            by_line[getattr(result.tile, axis)].append(result.complete)
        return sorted(line for line, flags in by_line.items() if len(flags) == size and all(flags))

    rows, columns = complete_lines("row"), complete_lines("column")
    return TeamScore(
        team_id=team_id,
        tiles=results,
        completed_rows=rows,
        completed_columns=columns,
        row_points=Decimal(len(rows) * (bonuses.row or 0)),
        column_points=Decimal(len(columns) * (bonuses.column or 0)),
    )


def contributions(tiles: Sequence[Tile], drops: Iterable[AcceptedDrop]) -> dict[str, Fraction]:
    """Exact fractions: summing per-drop shares (1/3 + 1/3 + 1/3) must give exactly 1."""
    by_position = {tile.position: tile for tile in tiles}
    totals: dict[str, Fraction] = defaultdict(Fraction)
    for drop in drops:
        tile = by_position.get(drop.position)
        if tile is None or tile.requirement <= 0:
            continue
        share = Fraction(drop.weight) * drop.quantity / Fraction(tile.requirement)
        totals[drop.player_id] += share * Fraction(tile.score)
    return dict(totals)


def competition_positions(totals: Sequence[tuple[str, Decimal]]) -> dict[str, tuple[int, bool]]:
    """Standard competition ranking: ties share a position, the next one is skipped."""
    ordered = sorted(totals, key=lambda item: item[1], reverse=True)
    counts: dict[Decimal, int] = defaultdict(int)
    for _, total in ordered:
        counts[total] += 1
    positions: dict[str, tuple[int, bool]] = {}
    for index, (key, total) in enumerate(ordered):
        tied_with_previous = index > 0 and total == ordered[index - 1][1]
        position = positions[ordered[index - 1][0]][0] if tied_with_previous else index + 1
        positions[key] = (position, counts[total] > 1)
    return positions
