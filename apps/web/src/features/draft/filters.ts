import { regionOf, type Region } from '../profiles/timezones'
import type { Activity } from '../profiles/types'
import type { Player } from '../teams/types'

export const SORTS = ['ehb', 'kc', 'name'] as const
export type DraftSort = (typeof SORTS)[number]

export interface DraftFilter {
  region: Region | 'all'
  activity: Activity | 'any'
  sort: DraftSort
}

export const DEFAULT_FILTER: DraftFilter = { region: 'all', activity: 'any', sort: 'ehb' }

const descending = (a: number | null | undefined, b: number | null | undefined) =>
  (b ?? -1) - (a ?? -1)

/** Filters and orders the loaded players; never changes the data itself (FR-004). */
export function visiblePlayers(players: Player[], filter: DraftFilter): Player[] {
  const shown = players.filter(
    (player) =>
      (filter.region === 'all' || regionOf(player.timezone) === filter.region) &&
      (filter.activity === 'any' || player.activity === filter.activity),
  )
  const byName = (a: Player, b: Player) => a.display_name.localeCompare(b.display_name)
  return [...shown].sort((a, b) =>
    filter.sort === 'name'
      ? byName(a, b)
      : descending(
          filter.sort === 'ehb' ? a.ehb_total : a.boss_kc_total,
          filter.sort === 'ehb' ? b.ehb_total : b.boss_kc_total,
        ) || byName(a, b),
  )
}
