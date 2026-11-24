import type { BingoEvent, EventStatus } from './types'

/** Statuses shown to players on the home and rules pages (feature 068). */
export const OPEN_EVENT_STATUSES: EventStatus[] = ['active', 'draft']

/** Active events first, then drafts by start date. */
export function sortOpenEvents(events: BingoEvent[]): BingoEvent[] {
  const rank = (event: BingoEvent) => (event.status === 'active' ? 0 : 1)
  return [...events]
    .filter((event) => OPEN_EVENT_STATUSES.includes(event.status))
    .sort((a, b) => rank(a) - rank(b) || Date.parse(a.start_at) - Date.parse(b.start_at))
}

/** Days the home page celebrates a finished event (feature 071, matches the API window). */
const PODIUM_DAYS = 7
const DAY_MS = 86_400_000

/** The most recently finished event still inside the podium window, if any. */
export function recentlyFinished(events: BingoEvent[], now: number): BingoEvent | null {
  const ended = (event: BingoEvent) => Date.parse(event.finished_at ?? event.updated_at)
  return (
    events
      .filter((event) => event.status === 'finished')
      .filter((event) => now - ended(event) <= PODIUM_DAYS * DAY_MS)
      .sort((a, b) => ended(b) - ended(a))[0] ?? null
  )
}
