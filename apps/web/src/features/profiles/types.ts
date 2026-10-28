import type { Skill } from './skills'
export const COMBAT_SKILLS = [
  'attack',
  'strength',
  'defence',
  'hitpoints',
  'ranged',
  'prayer',
  'magic',
] as const
export const MEMBER_SEARCH_MIN_LENGTH = 2
export const ACTIVITIES = ['under_1h', 'one_to_three_h', 'over_3h'] as const

export type Activity = (typeof ACTIVITIES)[number]
export type CombatSkill = (typeof COMBAT_SKILLS)[number]
export type WomStatus = 'found' | 'not_found' | 'unavailable'

export interface LinkedAccount {
  id: string
  rsn: string
  is_main: boolean
  wom_status: WomStatus
  total_level: number | null
  ehp: number | null
  ehb: number | null
  boss_kc: number | null
  /** Missing until the account's first WOM read after feature 021 revision 2. */
  combat: Partial<Record<CombatSkill, number>> | null
  /** Every skill level (feature 032); null until the account is read from WOM again. */
  skills?: Partial<Record<Skill, number>> | null
  /** Kill count per boss (feature 039); null until the account is read again. */
  bosses?: Record<string, number> | null
  /** null until the account is read again after feature 034. */
  wikisync?: WikiSync | null
  wom_updated_at: string | null
  checked_at: string | null
  wom_url: string
}

export interface BalanceTotals {
  boss_kc: number
  /** Raids KC apart from boss KC (feature 039). */
  raids_kc?: number
  ehb: number
  counted: number
  total: number
  not_found: string[]
}

export interface Profile {
  discord_id: string
  username: string
  timezone: string | null
  activity: Activity | null
  accounts: LinkedAccount[]
  totals: BalanceTotals
}

export interface Preferences {
  timezone: string | null
  activity: Activity | null
}

export type AccountAction = 'main' | 'refresh' | 'track' | 'remove'

/** Same limit as the API (feature 021). */
export const MAX_ACCOUNTS = 10

/** A clan member for the preferred-teammates search (feature 022). */
export interface Member {
  user_id: string
  username: string
  main_rsn: string | null
}

export interface DiaryRegion {
  region: string
  easy: boolean
  medium: boolean
  hard: boolean
  elite: boolean
}

/** Quests and achievement diaries from the WikiSync plugin (feature 034). */
export interface WikiSync {
  status: 'found' | 'not_found' | 'unavailable'
  quest_points?: number | null
  quests_completed?: number | null
  quests_total?: number | null
  hard_diaries?: number | null
  diaries: DiaryRegion[]
  checked_at?: string | null
}
