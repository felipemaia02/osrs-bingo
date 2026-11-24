import type { Tile } from '../bingo/types'
import { progressRatio } from '../scoring/progressShade'

const OBJECTIVES_SHOWN = 5

/** Started tiles not yet complete, most advanced first (077 FR-002). */
export function nextObjectives(tiles: Tile[]): Tile[] {
  return tiles
    .filter((tile) => tile.progress && !tile.progress.complete && tile.progress.value > 0)
    .sort(
      (a, b) =>
        progressRatio(b.progress!.value, b.requirement) -
          progressRatio(a.progress!.value, a.requirement) || a.position - b.position,
    )
    .slice(0, OBJECTIVES_SHOWN)
}
