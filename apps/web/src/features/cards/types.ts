export type CardStatus = 'active' | 'retired'
export type CardDifficulty = 'Low' | 'Mid' | 'High'
export type CardKind = 'boss' | 'boss_group' | 'raid' | 'activity' | 'task'

export interface AcceptedDrop {
  key: string
  name: string
  progress_weight: number
  aliases: string[]
  verification_note: string | null
  counting_restriction: string | null
}

export interface WikiImage {
  article_title: string
  article_url: string
  file_name: string
  file_page_url: string
  image_url: string
  width: number
  height: number
  mime_type: string
  attribution: string
  license_name: string | null
  license_url: string | null
  resolved_at: string
}

export interface CardProvenance {
  source: 'workbook' | 'admin'
  source_ref: string | null
  source_cells: string[]
  derived_from_revision: number | null
}

export interface CardRevision {
  revision: number
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
  change_reason: string
  created_by: string
  created_at: string
}

export interface CardSummary {
  id: string
  slug: string
  status: CardStatus
  current_revision: number
  revision: CardRevision
  created_at: string
  updated_at: string
}

export interface CardDetail extends CardSummary {
  revisions: CardRevision[]
  retired_by: string | null
  retired_at: string | null
  retirement_reason: string | null
}

export interface CardRevisionPayload {
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
  change_reason: string
}

export interface CardCreatePayload extends CardRevisionPayload {
  slug: string
}

export interface WorkbookImportResult {
  source_sha256: string
  expected_cards: number
  expected_drops: number
  source_bonus_entries: number
  resolved_bonus_entries: number
  imported_cards: number
  existing_cards: number
  conflicting_slugs: string[]
  usable: boolean
}
