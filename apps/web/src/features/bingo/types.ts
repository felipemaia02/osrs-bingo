import type { AcceptedDrop } from '../cards/types'

export type TileTier = 'Low' | 'Mid' | 'High'

/** Presentation model of one board tile, mapped from the event board API snapshot. */
export interface Tile {
  id: string
  position: number
  row: number
  col: number
  name: string
  tier: TileTier
  points: number
  requirement: number
  progress: number | null
  drops: AcceptedDrop[]
  ruleNote: string | null
  imageUrl?: string | null
  imageSourceUrl?: string | null
  imageAttribution?: string | null
}

export type BoardView = 'grid' | 'list'
export type TierFilter = TileTier | 'all'

/** How a tile relates to the current search and difficulty filter. */
export interface TileMatch {
  /** True when the tile passes both the search and the difficulty filter. */
  matches: boolean
  /** Name of the accepted drop that matched the search, when the tile name itself did not. */
  matchedDrop: string | null
}
