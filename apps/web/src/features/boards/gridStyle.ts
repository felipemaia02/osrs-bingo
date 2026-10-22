import type { CSSProperties } from 'react'
import { DEFAULT_BOARD_SIZE } from './draft'

/** Columns for a labeled board grid: one axis column plus `size` equal columns. */
export function gridColumns(axisPx: number, size: number): CSSProperties {
  return { gridTemplateColumns: `${axisPx}px repeat(${size}, minmax(0, 1fr))` }
}

/**
 * Width that keeps each cell as wide as on a 6×6 board, so smaller boards
 * reuse the same cell size instead of stretching.
 */
export function sameCellWidth(axisPx: number, gapPx: number, size: number): CSSProperties {
  const fixed = axisPx + DEFAULT_BOARD_SIZE * gapPx
  return {
    width: `calc(${axisPx + size * gapPx}px + ${size} * ((100% - ${fixed}px) / ${DEFAULT_BOARD_SIZE}))`,
  }
}
