import type { EventBoard } from '../boards/types'
import type { TierFilter, Tile, TileMatch } from './types'

/** Maps the published board snapshot to tiles. Progress stays null: no score exists yet. */
export function boardToTiles(board: EventBoard): Tile[] {
  return board.positions.map(({ position, row, column, card }) => ({
    id: `${card.card_id}:${card.card_revision}`,
    position,
    row,
    col: column,
    name: card.name,
    tier: card.difficulty,
    points: card.tile_score,
    requirement: card.completion_requirement,
    progress: null,
    drops: card.drops,
    ruleNote: card.rule_note,
    imageUrl: card.wiki_image?.image_url ?? null,
    imageSourceUrl: card.wiki_image?.file_page_url ?? null,
    imageAttribution: card.wiki_image?.attribution ?? null,
  }))
}

/** Lowercases and strips accents so "Tumékén" matches "tumeken". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function matchTile(tile: Tile, search: string, tier: TierFilter): TileMatch {
  const tierMatches = tier === 'all' || tile.tier === tier
  const query = normalizeSearch(search)
  if (!query) return { matches: tierMatches, matchedDrop: null }
  if (normalizeSearch(tile.name).includes(query)) {
    return { matches: tierMatches, matchedDrop: null }
  }
  const drop = tile.drops.find((candidate) =>
    [candidate.name, ...candidate.aliases].some((label) => normalizeSearch(label).includes(query)),
  )
  return { matches: tierMatches && drop !== undefined, matchedDrop: drop?.name ?? null }
}

export function isFiltering(search: string, tier: TierFilter): boolean {
  return tier !== 'all' || normalizeSearch(search) !== ''
}
