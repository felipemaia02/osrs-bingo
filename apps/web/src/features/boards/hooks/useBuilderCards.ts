import { useMemo } from 'react'
import type {
  AcceptedDrop,
  CardCategory,
  CardDifficulty,
  CardKind,
  CardSummary,
} from '../../cards/types'
import { cardIdOf, cardKey } from '../draft'
import type { EventBoard } from '../types'

/** What the builder shows for a card key, from the saved snapshot or the catalog. */
export interface BuilderCard {
  key: string
  cardId: string
  revision: number
  name: string
  kind: CardKind
  difficulty: CardDifficulty
  points: number
  requirement: number
  drops: AcceptedDrop[]
  /** Feature 040: for the builder's category filter. */
  categories: CardCategory[]
  imageUrl: string | null
  /** Administrator's reason for an administrator revision; null for workbook imports. */
  changeReason: string | null
  retired: boolean
}

function fromCatalog(card: CardSummary): BuilderCard {
  const revision = card.revision
  return {
    key: cardKey(card.id, card.current_revision),
    cardId: card.id,
    revision: card.current_revision,
    name: revision.name,
    kind: revision.kind,
    difficulty: revision.difficulty,
    points: revision.tile_score,
    requirement: revision.completion_requirement,
    drops: revision.drops,
    categories: revision.categories ?? [],
    imageUrl: revision.wiki_image?.image_url ?? null,
    changeReason: revision.provenance.source === 'admin' ? revision.change_reason : null,
    retired: card.status === 'retired',
  }
}

/**
 * Catalog cards (current revisions, catalog order) and a resolver for any placed key: pinned
 * snapshots win over the catalog so a newer revision never changes what a position shows.
 */
export function useBuilderCards(board: EventBoard | null | undefined, catalog: CardSummary[]) {
  return useMemo(() => {
    const catalogCards = catalog.map(fromCatalog)
    const byKey = new Map(catalogCards.map((card) => [card.key, card]))
    const retiredIds = new Set(
      catalogCards.filter((card) => card.retired).map((card) => card.cardId),
    )
    for (const { card } of board?.positions ?? []) {
      const key = cardKey(card.card_id, card.card_revision)
      byKey.set(key, {
        key,
        cardId: card.card_id,
        revision: card.card_revision,
        name: card.name,
        kind: card.kind,
        difficulty: card.difficulty,
        points: card.tile_score,
        requirement: card.completion_requirement,
        drops: card.drops,
        categories: card.categories ?? byKey.get(key)?.categories ?? [],
        imageUrl: card.wiki_image?.image_url ?? null,
        changeReason: byKey.get(key)?.changeReason ?? null,
        retired: retiredIds.has(card.card_id),
      })
    }
    return {
      catalogCards,
      cardFor: (key: string | undefined) => (key ? (byKey.get(key) ?? null) : null),
      isRetired: (key: string) => retiredIds.has(cardIdOf(key)),
    }
  }, [board, catalog])
}
