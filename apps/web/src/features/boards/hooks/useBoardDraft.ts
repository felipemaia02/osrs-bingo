import { useEffect, useState } from 'react'
import {
  cardKey,
  fillEmpty,
  moveCard,
  placeCard,
  removeCard,
  sameDraft,
  toPositions,
  type Draft,
} from '../draft'
import type { EventBoard } from '../types'

function fromBoard(board: EventBoard | null | undefined): Draft {
  return Object.fromEntries(
    (board?.positions ?? []).map((position) => [
      position.position,
      cardKey(position.card.card_id, position.card.card_revision),
    ]),
  )
}

/** Local, unsaved board draft derived from the saved board (feature 007 save contract). */
export function useBoardDraft(board: EventBoard | null | undefined, loaded: boolean) {
  const [draft, setDraft] = useState<Draft>({})
  const saved = fromBoard(board)

  useEffect(() => {
    if (loaded) setDraft(fromBoard(board))
  }, [board, loaded])

  return {
    draft,
    dirty: !sameDraft(draft, saved),
    place: (key: string, position?: number) => {
      const placed = placeCard(draft, key, position)
      if (placed) setDraft(placed.draft)
      return placed?.position ?? null
    },
    remove: (position: number) => setDraft((current) => removeCard(current, position)),
    move: (from: number, to: number) => setDraft((current) => moveCard(current, from, to)),
    fill: (keys: string[]) => setDraft((current) => fillEmpty(current, keys)),
    clear: () => setDraft({}),
    payload: () => ({ expected_revision: board?.revision ?? 0, positions: toPositions(draft) }),
  }
}
