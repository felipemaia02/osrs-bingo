import { AxiosError } from 'axios'
import type {
  AcceptedDrop,
  CardCategory,
  CardDifficulty,
  CardKind,
  CardRevisionPayload,
  CardSummary,
  WikiImage,
} from './types'

/** One accepted drop while the card is being edited (feature 033: rows instead of text). */
export interface DropRow {
  uid: string
  /** Stable key of a drop that already exists in the revision; null for new drops. */
  key: string | null
  name: string
  itemIds: number[]
  matchByName: boolean
  iconUrl: string | null
  weight: string
  // Kept untouched: the form doesn't edit them, saving must not erase them.
  aliases: string[]
  verificationNote: string | null
  countingRestriction: string | null
}

export interface CardForm {
  slug: string
  name: string
  description: string
  kind: CardKind
  difficulty: CardDifficulty
  tileScore: string
  requirement: string
  drops: DropRow[]
  wikiArticle: string
  wikiImage: WikiImage | null
  ruleNote: string
  requiresPreverification: boolean
  categories: CardCategory[]
  changeReason: string
}

export const CARD_KINDS: CardKind[] = ['boss', 'boss_group', 'raid', 'activity', 'task']
export const CARD_DIFFICULTIES: CardDifficulty[] = ['Low', 'Mid', 'High']
export const DEFAULT_DROP_WEIGHT = '1'

let rowCounter = 0

export function newDropRow(changes: Partial<DropRow> = {}): DropRow {
  rowCounter += 1
  return {
    uid: `drop-${rowCounter}`,
    key: null,
    name: '',
    itemIds: [],
    matchByName: true,
    iconUrl: null,
    weight: DEFAULT_DROP_WEIGHT,
    aliases: [],
    verificationNote: null,
    countingRestriction: null,
    ...changes,
  }
}

export function emptyForm(): CardForm {
  return {
    slug: '',
    name: '',
    description: '',
    kind: 'boss',
    difficulty: 'Low',
    tileScore: '5',
    requirement: '1',
    drops: [newDropRow()],
    wikiArticle: '',
    wikiImage: null,
    ruleNote: '',
    requiresPreverification: false,
    categories: [],
    changeReason: '',
  }
}

/** Case-, accent- and spacing-insensitive, like the API compares item names. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

function dropKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const isLinked = (row: DropRow) => row.itemIds.length > 0

/** "Name | progress" lines of the Paste list option; progress defaults to 1. */
export function parsePastedDrops(text: string): { name: string; weight: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawWeight] = line.split('|').map((part) => part.trim())
      return { name: rawName.split(/\s+/).join(' '), weight: rawWeight || DEFAULT_DROP_WEIGHT }
    })
    .filter((line) => line.name)
}

/** How many of a drop complete the card; null when the numbers aren't valid yet. */
export function dropsNeeded(requirement: string, weight: string): number | null {
  const needed = Number(requirement)
  const each = Number(weight)
  if (!(needed > 0) || !(each > 0)) return null
  return Math.ceil(needed / each)
}

export function cardToForm(card: CardSummary): CardForm {
  const revision = card.revision
  return {
    slug: card.slug,
    name: revision.name,
    description: revision.description ?? '',
    kind: revision.kind,
    difficulty: revision.difficulty,
    tileScore: String(revision.tile_score),
    requirement: String(revision.completion_requirement),
    drops: revision.drops.map((drop) =>
      newDropRow({
        key: drop.key,
        name: drop.name,
        itemIds: drop.item_ids ?? [],
        matchByName: drop.match_by_name ?? true,
        weight: String(drop.progress_weight),
        aliases: drop.aliases,
        verificationNote: drop.verification_note,
        countingRestriction: drop.counting_restriction,
      }),
    ),
    wikiArticle: revision.wiki_image?.article_title ?? revision.name,
    wikiImage: revision.wiki_image,
    ruleNote: revision.rule_note ?? '',
    requiresPreverification: revision.requires_preverification ?? false,
    categories: revision.categories ?? [],
    changeReason: '',
  }
}

/** The rows that have a name, as the API stores them. */
export function toAcceptedDrops(rows: DropRow[]): AcceptedDrop[] {
  return rows
    .filter((row) => row.name.trim())
    .map((row) => {
      const name = row.name.trim().split(/\s+/).join(' ')
      return {
        key: row.key ?? dropKey(name),
        name,
        progress_weight: Number(row.weight),
        aliases: row.aliases,
        verification_note: row.verificationNote,
        counting_restriction: row.countingRestriction,
        item_ids: row.itemIds,
        match_by_name: row.matchByName,
      }
    })
}

/** Revision payload, or null when a drop is invalid (no name, progress ≤ 0 or repeated). */
export function toRevisionPayload(form: CardForm): CardRevisionPayload | null {
  const drops = toAcceptedDrops(form.drops)
  const names = new Set(drops.map((drop) => normalizeName(drop.name)))
  const keys = new Set(drops.map((drop) => drop.key))
  if (
    !drops.length ||
    names.size !== drops.length ||
    keys.size !== drops.length ||
    drops.some((drop) => !drop.key || !(drop.progress_weight > 0))
  )
    return null
  return {
    name: form.name,
    description: form.description || null,
    kind: form.kind,
    difficulty: form.difficulty,
    tile_score: Number(form.tileScore),
    completion_requirement: Number(form.requirement),
    drops,
    wiki_image: form.wikiImage,
    fallback_image_accepted: !form.wikiImage,
    rule_note: form.ruleNote || null,
    requires_preverification: form.requiresPreverification,
    categories: form.categories,
    change_reason: form.changeReason,
  }
}

const ERROR_TRANSLATION: Record<string, string> = {
  'Card changed while you were editing': 'cards.errors.changed',
  'Card slug already exists': 'cards.errors.slug',
}

export function cardErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  return (typeof detail === 'string' && ERROR_TRANSLATION[detail]) || 'common.apiError'
}
