import type { TileTier } from './types'

/** Badge tone per difficulty, shared by the grid, list and tile details. */
export const TIER_TONE: Record<TileTier, 'danger' | 'gold' | 'success'> = {
  Low: 'success',
  Mid: 'gold',
  High: 'danger',
}
