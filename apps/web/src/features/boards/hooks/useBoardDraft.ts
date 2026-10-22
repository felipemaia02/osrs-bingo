import { useEffect, useState } from 'react'
import {
  DEFAULT_BOARD_SIZE,
  cardKey,
  fillEmpty,
  moveCard,
  placeCard,
  removeCard,
  resizeDraft,
  sameDraft,
  toPositions,
  type Draft,
} from '../draft'
import type { BoardSavePayload, EventBoard } from '../types'

function fromBoard(board: EventBoard | null | undefined): Draft {
  return Object.fromEntries(
    (board?.positions ?? []).map((position) => [
      position.position,
      cardKey(position.card.card_id, position.card.card_revision),
    ]),
  )
}

function sizeOf(board: EventBoard | null | undefined): number {
  return board?.size ?? DEFAULT_BOARD_SIZE
}

/** Local, unsaved board draft derived from the saved board (feature 007 save contract). */
export function useBoardDraft(board: EventBoard | null | undefined, loaded: boolean) {
  const [draft, setDraft] = useState<Draft>({})
  const [size, setSize] = useState(DEFAULT_BOARD_SIZE)
  const saved = fromBoard(board)

  useEffect(() => {
    if (!loaded) return
    setDraft(fromBoard(board))
    setSize(sizeOf(board))
  }, [board, loaded])

  return {
    draft,
    size,
    total: size * size,
    dirty: size !== sizeOf(board) || !sameDraft(draft, saved),
    place: (key: string, position?: number) => {
      const placed = placeCard(draft, key, size, position)
      if (placed) setDraft(placed.draft)
      return placed?.position ?? null
    },
    remove: (position: number) => setDraft((current) => removeCard(current, position)),
    move: (from: number, to: number) => setDraft((current) => moveCard(current, from, to)),
    fill: (keys: string[]) => setDraft((current) => fillEmpty(current, keys, size)),
    clear: () => setDraft({}),
    /** Cards that would leave the board if it were resized to `to`. */
    cardsOutside: (to: number) => resizeDraft(draft, size, to).removed,
    resize: (to: number) => {
      setDraft(resizeDraft(draft, size, to).draft)
      setSize(to)
    },
    payload: (): BoardSavePayload => ({
      expected_revision: board?.revision ?? 0,
      size,
      positions: toPositions(draft),
    }),
  }
}
