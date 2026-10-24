import { useEffect, useState } from 'react'
import {
  DEFAULT_BOARD_SIZE,
  cardKey,
  fillEmpty,
  moveCard,
  placeCard,
  removeCard,
  resizeBonusRow,
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

export interface LineBonuses {
  row: number | null
  column: number | null
}

function bonusesOf(board: EventBoard | null | undefined): LineBonuses {
  return { row: board?.row_bonus ?? null, column: board?.column_bonus ?? null }
}

/** Local, unsaved board draft derived from the saved board (feature 007 save contract). */
export function useBoardDraft(board: EventBoard | null | undefined, loaded: boolean) {
  const [draft, setDraft] = useState<Draft>({})
  const [size, setSize] = useState(DEFAULT_BOARD_SIZE)
  const [bonuses, setBonuses] = useState<LineBonuses>(bonusesOf(board))
  const [bonusSlots, setBonusSlots] = useState(board?.bonus_slots ?? 0)
  const saved = fromBoard(board)

  useEffect(() => {
    if (!loaded) return
    setDraft(fromBoard(board))
    setSize(sizeOf(board))
    setBonuses(bonusesOf(board))
    setBonusSlots(board?.bonus_slots ?? 0)
  }, [board, loaded])

  return {
    draft,
    size,
    total: size * size + bonusSlots,
    bonusSlots,
    dirty:
      size !== sizeOf(board) ||
      bonusSlots !== (board?.bonus_slots ?? 0) ||
      bonuses.row !== bonusesOf(board).row ||
      bonuses.column !== bonusesOf(board).column ||
      !sameDraft(draft, saved),
    bonuses,
    setBonus: (line: keyof LineBonuses, value: number | null) =>
      setBonuses((current) => ({ ...current, [line]: value })),
    place: (key: string, position?: number) => {
      const placed = placeCard(draft, key, size, position, bonusSlots)
      if (placed) setDraft(placed.draft)
      return placed?.position ?? null
    },
    remove: (position: number) => setDraft((current) => removeCard(current, position)),
    move: (from: number, to: number) => setDraft((current) => moveCard(current, from, to)),
    fill: (keys: string[]) => setDraft((current) => fillEmpty(current, keys, size, bonusSlots)),
    clear: () => setDraft({}),
    /** Cards that would leave the board if it were resized to `to`. */
    cardsOutside: (to: number) => resizeDraft(draft, size, to, bonusSlots).removed,
    resize: (to: number) => {
      const resized = resizeDraft(draft, size, to, bonusSlots)
      setDraft(resized.draft)
      setBonusSlots(resized.bonusSlots)
      setSize(to)
    },
    /** Cards that would leave the bonus row if it had `slots` slots (feature 020). */
    cardsOutsideBonusRow: (slots: number) => resizeBonusRow(draft, size, slots).removed,
    setBonusSlots: (slots: number) => {
      setDraft(resizeBonusRow(draft, size, slots).draft)
      setBonusSlots(slots)
    },
    payload: (): BoardSavePayload => ({
      expected_revision: board?.revision ?? 0,
      size,
      row_bonus: bonuses.row,
      column_bonus: bonuses.column,
      bonus_slots: bonusSlots,
      positions: toPositions(draft),
    }),
  }
}
