import { AxiosError } from 'axios'
import type {
  AcceptedDrop,
  CardDifficulty,
  CardKind,
  CardRevisionPayload,
  CardSummary,
  WikiImage,
} from './types'

export interface CardForm {
  slug: string
  name: string
  description: string
  kind: CardKind
  difficulty: CardDifficulty
  tileScore: string
  requirement: string
  drops: string
  wikiArticle: string
  wikiImage: WikiImage | null
  ruleNote: string
  changeReason: string
}

export const CARD_KINDS: CardKind[] = ['boss', 'boss_group', 'raid', 'activity', 'task']
export const CARD_DIFFICULTIES: CardDifficulty[] = ['Low', 'Mid', 'High']

export const EMPTY_FORM: CardForm = {
  slug: '',
  name: '',
  description: '',
  kind: 'boss',
  difficulty: 'Low',
  tileScore: '5',
  requirement: '1',
  drops: '',
  wikiArticle: '',
  wikiImage: null,
  ruleNote: '',
  changeReason: '',
}

function dropKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Parses "name | weight" lines. Drops already present in the revision being edited keep
 * their stable key, aliases, verification note and counting restriction; the text form
 * only edits names and weights, so it must not silently erase the rest.
 */
export function parseDrops(value: string, previous: AcceptedDrop[] = []): AcceptedDrop[] {
  const previousByName = new Map(previous.map((drop) => [drop.name.toLocaleLowerCase(), drop]))
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawWeight] = line.split('|').map((part) => part.trim())
      const existing = previousByName.get(rawName.toLocaleLowerCase())
      return {
        key: existing?.key ?? dropKey(rawName),
        name: rawName,
        progress_weight: Number(rawWeight),
        aliases: existing?.aliases ?? [],
        verification_note: existing?.verification_note ?? null,
        counting_restriction: existing?.counting_restriction ?? null,
      }
    })
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
    drops: revision.drops.map((drop) => `${drop.name} | ${drop.progress_weight}`).join('\n'),
    wikiArticle: revision.wiki_image?.article_title ?? revision.name,
    wikiImage: revision.wiki_image,
    ruleNote: revision.rule_note ?? '',
    changeReason: '',
  }
}

/** Revision payload, or null when a drop line is invalid. */
export function toRevisionPayload(
  form: CardForm,
  previousDrops?: AcceptedDrop[],
): CardRevisionPayload | null {
  const drops = parseDrops(form.drops, previousDrops)
  if (drops.some((drop) => !drop.name || !drop.key || !(drop.progress_weight > 0))) return null
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
