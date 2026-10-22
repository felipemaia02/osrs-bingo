import {
  columnOf,
  emptyPositions,
  fillEmpty,
  moveCard,
  placeCard,
  removeCard,
  rowOf,
  sameDraft,
  toPositions,
  type Draft,
} from '../../src/features/boards/draft'

describe('board draft', () => {
  it('places a card in the chosen empty position or the first empty one', () => {
    expect(placeCard({}, 'a:1', 5)).toEqual({ draft: { 5: 'a:1' }, position: 5 })
    expect(placeCard({ 1: 'a:1' }, 'b:1')).toEqual({ draft: { 1: 'a:1', 2: 'b:1' }, position: 2 })
    expect(placeCard({ 5: 'a:1' }, 'b:2', 5)?.position).toBe(1)
  })

  it('never places the same card twice, even in another revision', () => {
    expect(placeCard({ 1: 'a:1' }, 'a:2')).toBeNull()
  })

  it('reports a full board', () => {
    const full: Draft = Object.fromEntries(Array.from({ length: 36 }, (_, i) => [i + 1, `c${i}:1`]))
    expect(placeCard(full, 'z:1')).toBeNull()
    expect(emptyPositions(full)).toEqual([])
  })

  it('moves into an empty position and swaps with an occupied one', () => {
    expect(moveCard({ 1: 'a:1' }, 1, 7)).toEqual({ 7: 'a:1' })
    expect(moveCard({ 1: 'a:1', 2: 'b:1' }, 1, 2)).toEqual({ 1: 'b:1', 2: 'a:1' })
    const draft = { 1: 'a:1' }
    expect(moveCard(draft, 1, 1)).toBe(draft)
    expect(moveCard(draft, 3, 1)).toBe(draft)
  })

  it('fills empty positions in order without duplicates and keeps existing ones', () => {
    const filled = fillEmpty({ 2: 'a:1' }, ['a:1', 'b:1', 'c:1'])
    expect(filled).toEqual({ 1: 'b:1', 2: 'a:1', 3: 'c:1' })
  })

  it('removes, compares and serializes the draft', () => {
    expect(removeCard({ 1: 'a:1', 2: 'b:3' }, 1)).toEqual({ 2: 'b:3' })
    expect(sameDraft({ 1: 'a:1' }, { 1: 'a:1' })).toBe(true)
    expect(sameDraft({ 1: 'a:1' }, { 2: 'a:1' })).toBe(false)
    expect(toPositions({ 8: 'b:3', 1: 'a:1' })).toEqual([
      { position: 1, card_id: 'a', card_revision: 1 },
      { position: 8, card_id: 'b', card_revision: 3 },
    ])
    expect([rowOf(8), columnOf(8)]).toEqual([2, 2])
  })
})
