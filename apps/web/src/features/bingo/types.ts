import type { AcceptedDrop, CardKind } from '../cards/types'

export type TileTier = 'Low' | 'Mid' | 'High'

/** Presentation model of one board tile, mapped from the event board API snapshot. */
export interface Tile {
  id: string
  position: number
  row: number
  col: number
  name: string
  kind: CardKind
  tier: TileTier
  points: number
  requirement: number
  drops: AcceptedDrop[]
  ruleNote: string | null
  requiresPreverification: boolean
  imageUrl?: string | null
  imageSourceUrl?: string | null
  imageAttribution?: string | null
}

export type BoardView = 'grid' | 'list'
export type TierFilter = TileTier | 'all'

export interface MatchedDrop {
  name: string
  progressWeight: number
}

/** How a tile relates to the current search and difficulty filter. */
export interface TileMatch {
  /** True when the tile passes both the search and the difficulty filter. */
  matches: boolean
  /** The accepted drop that matched the search, when the tile name itself did not. */
  matchedDrop: MatchedDrop | null
}
