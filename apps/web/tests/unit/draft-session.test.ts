import {
  draftAssignments,
  draftPlayer,
  moveInOrder,
  newSession,
  onTheClock,
  removeMember,
  restoreSession,
  roundAndPick,
  shiftTeam,
  teamForSlot,
  undo,
} from '../../src/features/draft/session'

const ORDER = ['domo', 'flu', 'ricky']

function draftMany(players: string[]) {
  return players.reduce((session, player) => draftPlayer(session, player), newSession(ORDER))
}

describe('Draft session (076)', () => {
  it('follows the snake order across rounds', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((slot) => teamForSlot(ORDER, slot))).toEqual([
      'domo',
      'flu',
      'ricky',
      'ricky',
      'flu',
      'domo',
      'domo',
    ])
    const session = draftMany(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(session.picks.map((pick) => pick.teamId)).toEqual([
      'domo',
      'flu',
      'ricky',
      'ricky',
      'flu',
      'domo',
    ])
    expect(roundAndPick(session)).toEqual({ round: 3, pick: 7 })
  })

  it('undoes picks and removals in reverse order', () => {
    let session = draftMany(['a', 'b'])
    session = removeMember(session, 'a')
    expect(onTheClock(session)).toBe('domo')
    session = undo(session)
    expect(session.picks.map((pick) => pick.playerId)).toEqual(['a', 'b'])
    session = undo(session)
    expect(session.picks.map((pick) => pick.playerId)).toEqual(['a'])
    expect(onTheClock(session)).toBe('flu')
  })

  it('gives the turn back to the team that lost a pick', () => {
    const session = removeMember(draftMany(['a', 'b', 'c']), 'b')
    expect(onTheClock(session)).toBe('flu')
    const picks = draftPlayer(session, 'z').picks
    expect(picks[picks.length - 1]).toEqual({ playerId: 'z', teamId: 'flu', slot: 1 })
  })

  it('lets Prev/Next pick for another team without changing the order', () => {
    const session = shiftTeam(newSession(ORDER), -1)
    expect(onTheClock(session)).toBe('ricky')
    const picked = draftPlayer(session, 'a')
    expect(picked.picks[0].teamId).toBe('ricky')
    expect(onTheClock(picked)).toBe('flu')
    expect(picked.order).toEqual(ORDER)
  })

  it('reorders teams only before the first pick', () => {
    const moved = moveInOrder(newSession(ORDER), 'ricky', -1)
    expect(moved.order).toEqual(['domo', 'ricky', 'flu'])
    expect(moveInOrder(draftPlayer(moved, 'a'), 'domo', 1).order).toEqual(moved.order)
  })

  it('sends each change with the team the board saw', () => {
    let session = draftMany(['a'])
    session = removeMember(session, 'old-member')
    const teams: Record<string, string | null> = { a: null, 'old-member': 'flu' }
    expect(draftAssignments(session, (id) => teams[id])).toEqual([
      { player_id: 'old-member', from_team_id: 'flu', team_id: null },
      { player_id: 'a', from_team_id: null, team_id: 'domo' },
    ])
  })

  it('restores only teams and players that still exist', () => {
    const stored = JSON.parse(JSON.stringify(draftMany(['a', 'gone'])))
    const restored = restoreSession(stored, ['flu', 'domo', 'new'], new Set(['a']))!
    expect(restored.order).toEqual(['domo', 'flu', 'new'])
    expect(restored.picks.map((pick) => pick.playerId)).toEqual(['a'])
    expect(restoreSession('junk', ORDER, new Set())).toBeNull()
  })
})
