import type { EventBoard } from '../boards/types'
import type { TeamScore } from '../scoring/types'
import { normalizeSearch } from '../../lib/text/search'
import type { TierFilter, Tile, TileMatch } from './types'

/** Maps the published board snapshot to tiles. No progress or score exists yet (BR-001). */
export function boardToTiles(board: EventBoard, score?: TeamScore | null): Tile[] {
  const progress = new Map(score?.tiles.map((tile) => [tile.position, tile]))
  return board.positions.map(({ position, row, column, card, bonus, updates }) => ({
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
    bonus: Boolean(bonus),
    imageUrl: card.wiki_image?.image_url ?? null,
    imageSourceUrl: card.wiki_image?.file_page_url ?? null,
    imageAttribution: card.wiki_image?.attribution ?? null,
    progress: toProgress(progress.get(position)),
    lastUpdate: updates?.length
      ? { reason: updates[updates.length - 1].reason, at: updates[updates.length - 1].updated_at }
      : null,
  }))
}

function toProgress(tile: TeamScore['tiles'][number] | undefined): Tile['progress'] {
  if (!tile) return null
  return {
    value: tile.progress,
    requirement: tile.requirement,
    complete: tile.complete,
    points: tile.points,
    drops: tile.drops.map((drop) => ({
      name: drop.drop_name,
      count: drop.count,
      progress: drop.progress,
    })),
  }
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
