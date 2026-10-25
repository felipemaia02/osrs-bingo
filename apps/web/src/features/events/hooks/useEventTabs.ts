import { useState } from 'react'
import { normalizeSearch } from '../../../lib/text/search'
import type { BingoEvent, EventStatus } from '../types'

export type EventTab = EventStatus | 'all' | 'mine'
export const EVENT_TABS: EventTab[] = ['all', 'draft', 'active', 'finished']
/** Players also get "Mine" (feature 026). */
export const PLAYER_EVENT_TABS: EventTab[] = ['all', 'mine', 'draft', 'active', 'finished']

/**
 * Local tab and name filter over the already loaded events (no extra requests).
 * `mine` holds the ids of the player's events; null hides the "Mine" tab.
 */
export function useEventTabs(events: BingoEvent[], mine: Set<string> | null = null) {
  const [tab, setTab] = useState<EventTab>('all')
  const [search, setSearch] = useState('')
  const tabs = mine ? PLAYER_EVENT_TABS : EVENT_TABS
  const inTab = (value: EventTab) =>
    value === 'all'
      ? events
      : value === 'mine'
        ? events.filter((event) => mine?.has(event.id))
        : events.filter((event) => event.status === value)
  const counts = Object.fromEntries(tabs.map((value) => [value, inTab(value).length])) as Record<
    EventTab,
    number
  >
  const query = normalizeSearch(search)
  const visible = inTab(tab).filter(
    (event) => !query || normalizeSearch(event.name).includes(query),
  )
  return { tab, setTab, tabs, counts, visible, search, setSearch }
}
