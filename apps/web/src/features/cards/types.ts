export type CardStatus = 'active' | 'retired'
export type CardDifficulty = 'Low' | 'Mid' | 'High'
export type CardKind = 'boss' | 'boss_group' | 'raid' | 'activity' | 'task'

/** Clan-style groups for browsing (feature 040); never used for scoring. */
export const CARD_CATEGORIES = [
  'solo_bosses',
  'slayer_bosses',
  'wilderness_bosses',
  'raids',
  'skilling_bosses',
  'skilling',
  'minigames',
  'other',
] as const
export type CardCategory = (typeof CARD_CATEGORIES)[number]

export interface AcceptedDrop {
  key: string
  name: string
  progress_weight: number
  aliases: string[]
  verification_note: string | null
  counting_restriction: string | null
  /** OSRS item IDs (feature 033); empty for free-text drops. */
  item_ids?: number[]
  /** False when a specific version was picked: only its IDs count. */
  match_by_name?: boolean
}

/** One pick in the drop search (feature 033). */
export interface ItemOption {
  name: string
  label: string
  item_ids: number[]
  icon_url: string | null
  any_version: boolean
  versions: number
}

export interface ItemSearchResult {
  ready: boolean
  items: ItemOption[]
}

export interface DropMatchInput {
  name: string
  aliases: string[]
  item_ids: number[]
  match_by_name: boolean
}

export interface DropMatchPreview {
  available: boolean
  days: number
  total: number
  per_drop: number[]
}

export interface LinkItemsResult {
  linked_cards: number
  linked_drops: number
  unlinked_drops: number
  /** Workbook cards that got their bundled categories (feature 040). */
  categorized_cards?: number
  skipped_cards: string[]
}

/** Clan artwork uploaded for a card (feature 041). */
export interface CardArtwork {
  key: string
  content_type: string
  artist: string | null
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
  artwork?: CardArtwork | null
  fallback_image_accepted: boolean
  rule_note: string | null
  requires_preverification?: boolean
  categories?: CardCategory[]
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
  artwork: CardArtwork | null
  fallback_image_accepted: boolean
  rule_note: string | null
  requires_preverification: boolean
  categories: CardCategory[]
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
