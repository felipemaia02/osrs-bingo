/**
 * Draft board session (feature 076): picks live in the browser until "Save teams".
 * Pure functions; the hook keeps the state and the local copy.
 */

export interface DraftPick {
  playerId: string
  teamId: string
  /** Position in the snake order (0-based); the team on the clock comes from it. */
  slot: number
}

export type DraftAction =
  | { kind: 'pick'; pick: DraftPick }
  | { kind: 'unpick'; pick: DraftPick }
  /** A player already on a team when the board opened, sent back to the pool. */
  | { kind: 'release'; playerId: string }

export interface DraftSession {
  /** Team ids in pick order; reorderable before the first pick (FR-003). */
  order: string[]
  picks: DraftPick[]
  released: string[]
  history: DraftAction[]
  /** Prev/Next team: who receives the next pick instead of the order (FR-005). */
  manualTeamId: string | null
}

export interface DraftAssignment {
  player_id: string
  from_team_id: string | null
  team_id: string | null
}

export function newSession(order: string[]): DraftSession {
  return { order, picks: [], released: [], history: [], manualTeamId: null }
}

export const hasChanges = (session: DraftSession) =>
  session.picks.length > 0 || session.released.length > 0

/** The first slot no pick holds: a removed pick gives that team the turn back. */
export function nextSlot(session: DraftSession): number {
  const taken = new Set(session.picks.map((pick) => pick.slot))
  let slot = 0
  while (taken.has(slot)) slot++
  return slot
}

/** Snake order: round 1 A→B→C, round 2 C→B→A, and so on. */
export function teamForSlot(order: string[], slot: number): string | null {
  if (!order.length) return null
  const round = Math.floor(slot / order.length)
  const index = slot % order.length
  return order[round % 2 === 0 ? index : order.length - 1 - index]
}

export function onTheClock(session: DraftSession): string | null {
  return session.manualTeamId ?? teamForSlot(session.order, nextSlot(session))
}

/** "Round R · Pick P" of the next pick, both 1-based. */
export function roundAndPick(session: DraftSession): { round: number; pick: number } {
  const slot = nextSlot(session)
  const teams = Math.max(session.order.length, 1)
  return { round: Math.floor(slot / teams) + 1, pick: slot + 1 }
}

export function draftPlayer(session: DraftSession, playerId: string): DraftSession {
  const teamId = onTheClock(session)
  if (!teamId || session.picks.some((pick) => pick.playerId === playerId)) return session
  const pick = { playerId, teamId, slot: nextSlot(session) }
  return {
    ...session,
    picks: [...session.picks, pick],
    history: [...session.history, { kind: 'pick', pick }],
    manualTeamId: null,
  }
}

/** × on a member: a pick goes back to the pool; a member from before the session too. */
export function removeMember(session: DraftSession, playerId: string): DraftSession {
  const pick = session.picks.find((item) => item.playerId === playerId)
  if (pick)
    return {
      ...session,
      picks: session.picks.filter((item) => item !== pick),
      history: [...session.history, { kind: 'unpick', pick }],
    }
  if (session.released.includes(playerId)) return session
  return {
    ...session,
    released: [...session.released, playerId],
    history: [...session.history, { kind: 'release', playerId }],
  }
}

/** Reverts the last pick or removal (FR-006). */
export function undo(session: DraftSession): DraftSession {
  const last = session.history[session.history.length - 1]
  if (!last) return session
  const history = session.history.slice(0, -1)
  if (last.kind === 'pick')
    return {
      ...session,
      history,
      picks: session.picks.filter((pick) => pick.playerId !== last.pick.playerId),
    }
  if (last.kind === 'unpick')
    return {
      ...session,
      history,
      picks: [...session.picks, last.pick].sort((a, b) => a.slot - b.slot),
    }
  return { ...session, history, released: session.released.filter((id) => id !== last.playerId) }
}

/** Prev/Next team for the next pick; the order itself doesn't change. */
export function shiftTeam(session: DraftSession, step: number): DraftSession {
  const current = onTheClock(session)
  const count = session.order.length
  if (!current || !count) return session
  const index = session.order.indexOf(current)
  return { ...session, manualTeamId: session.order[(index + step + count) % count] }
}

export const canReorder = (session: DraftSession) => session.picks.length === 0

export function moveInOrder(session: DraftSession, teamId: string, step: number): DraftSession {
  const index = session.order.indexOf(teamId)
  const target = index + step
  if (!canReorder(session) || index < 0 || target < 0 || target >= session.order.length)
    return session
  const order = [...session.order]
  ;[order[index], order[target]] = [order[target], order[index]]
  return { ...session, order }
}

/** What "Save teams" sends: each change with the team the board saw (FR-007). */
export function draftAssignments(
  session: DraftSession,
  teamOf: (playerId: string) => string | null,
): DraftAssignment[] {
  return [
    ...session.released.map((playerId) => ({
      player_id: playerId,
      from_team_id: teamOf(playerId),
      team_id: null,
    })),
    ...session.picks.map((pick) => ({
      player_id: pick.playerId,
      from_team_id: teamOf(pick.playerId),
      team_id: pick.teamId,
    })),
  ]
}

/**
 * A stored session that still fits the event (FR-008): known teams and players only.
 * Anything that no longer fits is dropped instead of restored.
 */
export function restoreSession(
  stored: unknown,
  teamIds: string[],
  playerIds: Set<string>,
): DraftSession | null {
  if (!stored || typeof stored !== 'object') return null
  const raw = stored as Partial<DraftSession>
  if (!Array.isArray(raw.order) || !Array.isArray(raw.picks) || !Array.isArray(raw.released))
    return null
  const teams = new Set(teamIds)
  const order = raw.order.filter((id) => teams.has(id))
  const picks = raw.picks.filter((pick) => teams.has(pick.teamId) && playerIds.has(pick.playerId))
  const released = raw.released.filter((id) => playerIds.has(id))
  const missing = teamIds.filter((id) => !order.includes(id))
  return {
    order: [...order, ...missing],
    picks,
    released,
    // Undo history only covers what is still on the board.
    history: [
      ...released.map((playerId) => ({ kind: 'release' as const, playerId })),
      ...picks.map((pick) => ({ kind: 'pick' as const, pick })),
    ],
    manualTeamId: null,
  }
}
