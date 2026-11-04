import type { AcceptedDrop, CardKind } from '../cards/types'

export type TileTier = 'Low' | 'Mid' | 'High'

/** The viewer's own team progress on a tile (feature 006); weights are progress, not points. */
export interface TileProgress {
  value: number
  requirement: number
  complete: boolean
  points: number
  drops: Array<{ name: string; count: number; progress: number }>
}

/** The viewer's own pre-verification on a tile that needs one (feature 062). */
export type PreverificationState = 'needed' | 'pending' | 'accepted'

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
  /** Only for players who can submit, on tiles that need a pre-verification (062). */
  preverification?: PreverificationState
  /** Bonus-row card (feature 020): shown under the grid, never part of a row or column. */
  bonus: boolean
  /** Present only for players on a team in an active or finished event. */
  progress?: TileProgress | null
  imageUrl?: string | null
  imageSourceUrl?: string | null
  imageAttribution?: string | null
  /** Clan artwork credit (feature 041). */
  imageArtist?: string | null
  /** Latest fix of this square during the event (feature 036). */
  lastUpdate?: { reason: string; at: string } | null
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
