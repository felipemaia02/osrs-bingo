import type { EventBoard } from '../boards/types'
import { normalizeSearch } from '../../lib/text/search'
import type { TierFilter, Tile, TileMatch } from './types'

/** Maps the published board snapshot to tiles. No progress or score exists yet (BR-001). */
export function boardToTiles(board: EventBoard): Tile[] {
  return board.positions.map(({ position, row, column, card }) => ({
    id: `${card.card_id}:${card.card_revision}`,
    position,
    row,
    col: column,
    name: card.name,
    kind: card.kind,
    tier: card.difficulty,
    points: card.tile_score,
    requirement: card.completion_requirement,
    drops: card.drops,
    ruleNote: card.rule_note,
    requiresPreverification: card.requires_preverification ?? false,
    imageUrl: card.wiki_image?.image_url ?? null,
    imageSourceUrl: card.wiki_image?.file_page_url ?? null,
    imageAttribution: card.wiki_image?.attribution ?? null,
  }))
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
  return {
    matches: tierMatches && drop !== undefined,
    matchedDrop: drop ? { name: drop.name, progressWeight: drop.progress_weight } : null,
  }
}

export function isFiltering(search: string, tier: TierFilter): boolean {
  return tier !== 'all' || normalizeSearch(search) !== ''
}

/** DOM id used by the mini-map to scroll to a tile in the row list. */
export function tileListItemId(tile: Tile): string {
  return `board-tile-${tile.position}`
}
