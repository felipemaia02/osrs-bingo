import {
  columnOf,
  emptyPositions,
  fillEmpty,
  moveCard,
  placeCard,
  removeCard,
  resizeDraft,
  rowOf,
  sameDraft,
  toPositions,
  type Draft,
} from '../../src/features/boards/draft'

describe('board draft', () => {
  it('places a card in the chosen empty position or the first empty one', () => {
    expect(placeCard({}, 'a:1', 6, 5)).toEqual({ draft: { 5: 'a:1' }, position: 5 })
    expect(placeCard({ 1: 'a:1' }, 'b:1', 6)).toEqual({
      draft: { 1: 'a:1', 2: 'b:1' },
      position: 2,
    })
    expect(placeCard({ 5: 'a:1' }, 'b:2', 6, 5)?.position).toBe(1)
  })

  it('never places the same card twice, even in another revision', () => {
    expect(placeCard({ 1: 'a:1' }, 'a:2', 6)).toBeNull()
  })

  it('reports a full board', () => {
    const full: Draft = Object.fromEntries(Array.from({ length: 36 }, (_, i) => [i + 1, `c${i}:1`]))
    expect(placeCard(full, 'z:1', 6)).toBeNull()
    expect(emptyPositions(full, 6)).toEqual([])
    expect(placeCard({ 1: 'a:1', 2: 'b:1', 3: 'c:1', 4: 'd:1' }, 'z:1', 2)).toBeNull()
  })

  it('moves into an empty position and swaps with an occupied one', () => {
    expect(moveCard({ 1: 'a:1' }, 1, 7)).toEqual({ 7: 'a:1' })
    expect(moveCard({ 1: 'a:1', 2: 'b:1' }, 1, 2)).toEqual({ 1: 'b:1', 2: 'a:1' })
    const draft = { 1: 'a:1' }
    expect(moveCard(draft, 1, 1)).toBe(draft)
    expect(moveCard(draft, 3, 1)).toBe(draft)
  })

  it('fills empty positions in order without duplicates and keeps existing ones', () => {
    const filled = fillEmpty({ 2: 'a:1' }, ['a:1', 'b:1', 'c:1'], 6)
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
    expect([rowOf(8, 6), columnOf(8, 6)]).toEqual([2, 2])
    expect([rowOf(8, 3), columnOf(8, 3)]).toEqual([3, 2])
  })

  it('resizes keeping rows and columns and reports cards outside the new area', () => {
    // 6×6: a at 1·1 (1), b at 2·3 (9), c at 1·5 (5), d at 5·1 (25)
    const draft: Draft = { 1: 'a:1', 9: 'b:1', 5: 'c:1', 25: 'd:1' }
    expect(resizeDraft(draft, 6, 4)).toEqual({
      draft: { 1: 'a:1', 7: 'b:1' },
      removed: ['c:1', 'd:1'],
    })
    expect(resizeDraft({ 1: 'a:1', 7: 'b:1' }, 4, 6)).toEqual({
      draft: { 1: 'a:1', 9: 'b:1' },
      removed: [],
    })
  })
})
