import { useState } from 'react'
import type { BingoEvent, EventStatus } from '../types'

export type EventTab = EventStatus | 'all'
export const EVENT_TABS: EventTab[] = ['all', 'draft', 'active', 'finished']

/** Local status filter over the already loaded events (no extra requests). */
export function useEventTabs(events: BingoEvent[]) {
  const [tab, setTab] = useState<EventTab>('all')
  const counts = Object.fromEntries(
    EVENT_TABS.map((value) => [
      value,
      value === 'all' ? events.length : events.filter((event) => event.status === value).length,
    ]),
  ) as Record<EventTab, number>
  const visible = tab === 'all' ? events : events.filter((event) => event.status === tab)
  return { tab, setTab, counts, visible }
}
