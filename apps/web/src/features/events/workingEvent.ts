import type { BingoEvent } from './types'

/** Events administrators still work on (teams, boards): finished ones are left out. */
export function workingEvents(events: BingoEvent[]): BingoEvent[] {
  return events.filter((event) => event.status !== 'finished')
}

/** The active event, otherwise the oldest draft (the one being prepared first). */
export function defaultWorkingEvent(events: BingoEvent[]): BingoEvent | null {
  const active = events.find((event) => event.status === 'active')
  if (active) return active
  const drafts = events
    .filter((event) => event.status === 'draft')
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  return drafts[0] ?? null
}
