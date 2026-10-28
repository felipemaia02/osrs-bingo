import type {
  AcceptedDrop,
  CardArtwork,
  CardCategory,
  CardDifficulty,
  CardKind,
  CardProvenance,
  WikiImage,
} from '../cards/types'

export interface BoardCardSnapshot {
  card_id: string
  slug: string
  card_revision: number
  name: string
  description: string | null
  kind: CardKind
  difficulty: CardDifficulty
  tile_score: number
  completion_requirement: number
  drops: AcceptedDrop[]
  wiki_image: WikiImage | null
  artwork?: CardArtwork | null
  fallback_image_accepted: boolean
  rule_note: string | null
  provenance: CardProvenance
  requires_preverification?: boolean
  categories?: CardCategory[]
}

/** A live fix of a square during the event (feature 036). */
export interface PositionUpdate {
  from_revision: number
  to_revision: number
  reason: string
  updated_by_name: string
  updated_at: string
}

export interface BoardPosition {
  position: number
  row: number
  column: number
  /** Bonus-row card (feature 020). */
  bonus?: boolean
  card: BoardCardSnapshot
  /** Changes made while the event was active, oldest first (feature 036). */
  updates?: PositionUpdate[]
}

export interface EventBoard {
  event_id: string
  status: 'draft' | 'published'
  revision: number
  size: number
  /** Points per completed row/column (features 006/019); null until set. */
  row_bonus?: number | null
  column_bonus?: number | null
  /** Bonus cards under the grid (feature 020); 0 when there is no bonus row. */
  bonus_slots?: number
  complete: boolean
  positions: BoardPosition[]
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface BoardSavePayload {
  expected_revision: number
  size: number
  row_bonus: number | null
  column_bonus: number | null
  bonus_slots: number
  positions: Array<{ position: number; card_id: string; card_revision: number }>
}

/** What is being dragged in the builder: a catalog card or a card already on the board. */
export type DragSource =
  { kind: 'catalog'; key: string; name: string } | { kind: 'slot'; position: number; name: string }
