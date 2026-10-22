/** Board draft: position (1–36) → pinned card key "<cardId>:<revision>". Pure helpers. */
export type Draft = Record<number, string>

export const BOARD_SIZE = 36
export const BOARD_COLUMNS = 6
export const POSITIONS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1)

export function cardKey(cardId: string, revision: number): string {
  return `${cardId}:${revision}`
}

export function cardIdOf(key: string): string {
  return key.split(':')[0]
}

export function revisionOf(key: string): number {
  return Number(key.split(':')[1])
}

export function rowOf(position: number): number {
  return Math.floor((position - 1) / BOARD_COLUMNS) + 1
}

export function columnOf(position: number): number {
  return ((position - 1) % BOARD_COLUMNS) + 1
}

export function emptyPositions(draft: Draft): number[] {
  return POSITIONS.filter((position) => !draft[position])
}

export function hasCard(draft: Draft, cardId: string): boolean {
  return Object.values(draft).some((key) => cardIdOf(key) === cardId)
}

/** Places a card in `position` (when empty) or the first empty position; null when impossible. */
export function placeCard(
  draft: Draft,
  key: string,
  position?: number,
): { draft: Draft; position: number } | null {
  if (hasCard(draft, cardIdOf(key))) return null
  const target = position !== undefined && !draft[position] ? position : emptyPositions(draft)[0]
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
export function fillEmpty(draft: Draft, keys: string[]): Draft {
  let next = draft
  for (const key of keys) {
    const placed = placeCard(next, key)
    if (placed) next = placed.draft
    if (!emptyPositions(next).length) break
  }
  return next
}

export function sameDraft(a: Draft, b: Draft): boolean {
  return POSITIONS.every((position) => (a[position] ?? '') === (b[position] ?? ''))
}

export function toPositions(draft: Draft) {
  return POSITIONS.filter((position) => draft[position]).map((position) => ({
    position,
    card_id: cardIdOf(draft[position]),
    card_revision: revisionOf(draft[position]),
  }))
}
