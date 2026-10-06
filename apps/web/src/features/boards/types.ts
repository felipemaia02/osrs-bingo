import type {
  AcceptedDrop,
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
  fallback_image_accepted: boolean
  rule_note: string | null
  provenance: CardProvenance
}

export interface BoardPosition {
  position: number
  row: number
  column: number
  card: BoardCardSnapshot
}

export interface EventBoard {
  event_id: string
  status: 'draft' | 'published'
  revision: number
  complete: boolean
  positions: BoardPosition[]
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface BoardSavePayload {
  expected_revision: number
  positions: Array<{ position: number; card_id: string; card_revision: number }>
}
