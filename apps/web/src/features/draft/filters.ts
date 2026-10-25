import type { Skill } from '../profiles/skills'
import { regionOf, type Region } from '../profiles/timezones'
import type { Activity } from '../profiles/types'
import type { Player } from '../teams/types'

export const SORTS = ['ehb', 'kc', 'name'] as const
export type DraftSort = (typeof SORTS)[number]
export const DEFAULT_MIN_LEVEL = 90

export interface DraftFilter {
  region: Region | 'all'
  activity: Activity | 'any'
  sort: DraftSort
  /** Feature 032: only players whose bingo account has this skill at `minLevel` or above. */
  skill: Skill | 'any'
  /** null while the field is empty; then any level passes. */
  minLevel: number | null
}

export const DEFAULT_FILTER: DraftFilter = {
  region: 'all',
  activity: 'any',
  sort: 'ehb',
  skill: 'any',
  minLevel: DEFAULT_MIN_LEVEL,
}

const descending = (a: number | null | undefined, b: number | null | undefined) =>
  (b ?? -1) - (a ?? -1)

/** The bingo account's level, or null when WOM data for it isn't stored yet. */
export function skillLevel(player: Player, skill: Skill): number | null {
  return player.account?.skills?.[skill] ?? null
}

const matchesProfile = (player: Player, filter: DraftFilter) =>
  (filter.region === 'all' || regionOf(player.timezone) === filter.region) &&
  (filter.activity === 'any' || player.activity === filter.activity)

/** Players hidden by the skill filter only because their skill data is missing. */
export function withoutSkillData(players: Player[], filter: DraftFilter): number {
  const { skill } = filter
  if (skill === 'any') return 0
  return players.filter(
    (player) => matchesProfile(player, filter) && skillLevel(player, skill) === null,
  ).length
}

function meetsSkill(player: Player, filter: DraftFilter): boolean {
  if (filter.skill === 'any') return true
  const level = skillLevel(player, filter.skill)
  return level !== null && level >= (filter.minLevel ?? 0)
}

/** Filters and orders the loaded players; never changes the data itself (FR-004). */
export function visiblePlayers(players: Player[], filter: DraftFilter): Player[] {
  const shown = players.filter(
    (player) => matchesProfile(player, filter) && meetsSkill(player, filter),
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
