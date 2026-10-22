import { useState } from 'react'
import { normalizeSearch } from '../../../lib/text/search'
import type { CardDifficulty, CardStatus, CardSummary } from '../types'

export type StatusFilter = CardStatus | 'all'
export type DifficultyFilter = CardDifficulty | 'all'
export const STATUS_FILTERS: StatusFilter[] = ['active', 'retired', 'all']

/** Card, drop and alias names, accent- and case-insensitive. */
export function matchesCardSearch(card: CardSummary, query: string): boolean {
  const needle = normalizeSearch(query)
  if (!needle) return true
  const labels = [
    card.revision.name,
    ...card.revision.drops.flatMap((drop) => [drop.name, ...drop.aliases]),
  ]
  return labels.some((label) => normalizeSearch(label).includes(needle))
}

/** Local catalog filters and selection (feature 016); never refetches. */
export function useCatalogView(cards: CardSummary[]) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts: Record<StatusFilter, number> = {
    active: cards.filter((card) => card.status === 'active').length,
    retired: cards.filter((card) => card.status === 'retired').length,
    all: cards.length,
  }
  const visible = cards.filter(
    (card) =>
      (status === 'all' || card.status === status) &&
      (difficulty === 'all' || card.revision.difficulty === difficulty) &&
      matchesCardSearch(card, query),
  )
  return {
    query,
    setQuery,
    status,
    setStatus,
    difficulty,
    setDifficulty,
    counts,
    visible,
    selected: cards.find((card) => card.id === selectedId) ?? null,
    setSelectedId,
  }
}
