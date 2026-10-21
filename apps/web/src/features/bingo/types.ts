export type TileTier = 'Low' | 'Mid' | 'High'

/** Presentation model of one board tile, mapped from the event board API snapshot. */
export interface Tile {
  id: string
  row: number
  col: number
  name: string
  tier: TileTier
  points: number
  requirement: number
  progress: number | null
  imageUrl?: string | null
  imageSourceUrl?: string | null
}
