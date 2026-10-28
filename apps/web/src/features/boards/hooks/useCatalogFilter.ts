import { matchesCategory, type CategoryFilter } from '../../cards/hooks/useCatalogView'
import { normalizeSearch } from '../../../lib/text/search'
import type { CardDifficulty } from '../../cards/types'
import { hasCard, type Draft } from '../draft'
import type { BuilderCard } from './useBuilderCards'

export type CatalogMode = 'available' | 'onBoard'
export type DifficultyFilter = CardDifficulty | 'all'

/** Search matches card names, drop names and aliases, ignoring case and accents. */
export function matchesCatalogSearch(card: BuilderCard, query: string): boolean {
  const needle = normalizeSearch(query)
  if (!needle) return true
  return [card.name, ...card.drops.flatMap((drop) => [drop.name, ...drop.aliases])].some((label) =>
    normalizeSearch(label).includes(needle),
  )
}

/** Catalog lists for the builder: available (active, not placed) or on board, plus retired. */
export function filterCatalog(
  cards: BuilderCard[],
  draft: Draft,
  {
    mode,
    difficulty,
    query,
    category = 'all',
  }: { mode: CatalogMode; difficulty: DifficultyFilter; query: string; category?: CategoryFilter },
) {
  const visible = (card: BuilderCard) =>
    (difficulty === 'all' || card.difficulty === difficulty) &&
    matchesCategory(card.categories, category) &&
    matchesCatalogSearch(card, query)
  const active = cards.filter((card) => !card.retired)
  const available = active.filter((card) => !hasCard(draft, card.cardId))
  const onBoard = active.filter((card) => hasCard(draft, card.cardId))
  return {
    available,
    onBoardCount: onBoard.length,
    items: (mode === 'available' ? available : onBoard).filter(visible),
    retired: mode === 'available' ? cards.filter((card) => card.retired).filter(visible) : [],
  }
}
