/**
 * Board draft: position (1–size²) → pinned card key "<cardId>:<revision>". Pure helpers.
 * `size` is the number of rows (and columns) of a square board.
 */
export type Draft = Record<number, string>

export const BOARD_SIZES = [3, 4, 5, 6] as const
export const DEFAULT_BOARD_SIZE = 6

export function positionsOf(size: number): number[] {
  return Array.from({ length: size * size }, (_, index) => index + 1)
}

export function axisOf(size: number): number[] {
  return Array.from({ length: size }, (_, index) => index + 1)
}

export function cardKey(cardId: string, revision: number): string {
  return `${cardId}:${revision}`
}

export function cardIdOf(key: string): string {
  return key.split(':')[0]
}

export function revisionOf(key: string): number {
  return Number(key.split(':')[1])
}

export function rowOf(position: number, size: number): number {
  return Math.floor((position - 1) / size) + 1
}

export function columnOf(position: number, size: number): number {
  return ((position - 1) % size) + 1
}

export function positionAt(row: number, column: number, size: number): number {
  return (row - 1) * size + column
}

function occupiedPositions(draft: Draft): number[] {
  return Object.keys(draft)
    .map(Number)
    .filter((position) => draft[position])
    .sort((a, b) => a - b)
}

export function emptyPositions(draft: Draft, size: number): number[] {
  return positionsOf(size).filter((position) => !draft[position])
}

export function hasCard(draft: Draft, cardId: string): boolean {
  return Object.values(draft).some((key) => cardIdOf(key) === cardId)
}

/** Places a card in `position` (when empty) or the first empty position; null when impossible. */
export function placeCard(
  draft: Draft,
  key: string,
  size: number,
  position?: number,
): { draft: Draft; position: number } | null {
  if (hasCard(draft, cardIdOf(key))) return null
  const target =
    position !== undefined && !draft[position] ? position : emptyPositions(draft, size)[0]
  if (target === undefined) return null
  return { draft: { ...draft, [target]: key }, position: target }
}

export function removeCard(draft: Draft, position: number): Draft {
  const next = { ...draft }
  delete next[position]
  return next
}

/** Moves a card to another position, swapping with the card already there. */
export function moveCard(draft: Draft, from: number, to: number): Draft {
  if (from === to || !draft[from]) return draft
  const next = { ...draft, [to]: draft[from] }
  if (draft[to]) next[from] = draft[to]
  else delete next[from]
  return next
}

/** Fills empty positions in order with the given keys, skipping cards already on the board. */
export function fillEmpty(draft: Draft, keys: string[], size: number): Draft {
  let next = draft
  for (const key of keys) {
    const placed = placeCard(next, key, size)
    if (placed) next = placed.draft
    if (!emptyPositions(next, size).length) break
  }
  return next
}

/**
 * Changes the board size keeping every card in its row and column (FR-006).
 * Cards outside the new area are dropped and returned in position order (FR-007).
 */
export function resizeDraft(
  draft: Draft,
  from: number,
  to: number,
): { draft: Draft; removed: string[] } {
  const next: Draft = {}
  const removed: string[] = []
  for (const position of occupiedPositions(draft)) {
    const row = rowOf(position, from)
    const column = columnOf(position, from)
    if (row > to || column > to) removed.push(draft[position])
    else next[positionAt(row, column, to)] = draft[position]
  }
  return { draft: next, removed }
}

export function sameDraft(a: Draft, b: Draft): boolean {
  const positions = new Set([...occupiedPositions(a), ...occupiedPositions(b)])
  return [...positions].every((position) => a[position] === b[position])
}

export function toPositions(draft: Draft) {
  return occupiedPositions(draft).map((position) => ({
    position,
    card_id: cardIdOf(draft[position]),
    card_revision: revisionOf(draft[position]),
  }))
}
