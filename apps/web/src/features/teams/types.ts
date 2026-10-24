export interface Team {
  id: string
  event_id: string
  name: string
  color: string | null
  member_count: number
}

export interface Player {
  id: string
  event_id: string
  team_id: string | null
  display_name: string
  status: 'pending' | 'approved' | 'removed'
  /** Linked Discord username; null for legacy registrations (administrator list only). */
  discord_username?: string | null
  /** When the registration was requested. */
  created_at?: string
  /** Profile account playing the event; null for nickname registrations (before 022). */
  account_id?: string | null
  activity?: 'under_1h' | 'one_to_three_h' | 'over_3h' | null
  buy_in_status?: BuyInStatus | null
  /** Admin roster only (feature 023): the player's current profile and roles. */
  role?: ParticipantRole | null
  boss_kc_total?: number | null
  ehb_total?: number | null
  alt_count?: number | null
  timezone?: string | null
  teammates?: string[]
  buy_in_admin_name?: string | null
}

export type BuyInStatus = 'pending' | 'paid'
export type ParticipantRole = 'captain' | 'instructor'
export const BUY_IN_STATUSES: BuyInStatus[] = ['pending', 'paid']
export const PARTICIPANT_ROLES: ParticipantRole[] = ['captain', 'instructor']

export interface ParticipationPayload {
  role: ParticipantRole | null
  buy_in_status: BuyInStatus
  buy_in_admin_id: string | null
}

export interface TeamBalance {
  team_id: string
  name: string
  color: string | null
  emblem_url?: string | null
  player_count: number
  boss_kc_total: number
  ehb_total: number
  captain: string | null
  /** EHB versus the average per team, in percent. */
  ehb_vs_average: number
  players_short: number
  balanced: boolean
}

export interface TeamBalanceResponse {
  average_ehb: number
  teams: TeamBalance[]
}

export interface TeamPayload {
  name: string
  color: string | null
}

/** Join request (feature 022); the three agreements must be true. */
export interface JoinPayload {
  account_id: string
  activity: 'under_1h' | 'one_to_three_h' | 'over_3h' | null
  teammate_ids: string[]
  accept_rules: true
  accept_drop_account: true
  accept_team: true
}

export interface PlayerAssignmentPayload {
  team_id: string | null
}

export type RosterGroup = 'pending' | 'unassigned' | 'assigned'
export interface PlayerFilters {
  group: RosterGroup
  search: string
  team_id?: string
  offset: number
  limit: number
}
export interface PlayerPage {
  items: Player[]
  total: number
  offset: number
  limit: number
  counts: Record<RosterGroup, number>
}

/** Result of an approve/remove action on selected registrations. */
export interface SelectionResult {
  changed: number
  skipped: number
}

/** Draft preview (feature 024): captains per team and players still without a team. */
export interface DraftCaptain {
  team_id: string
  team_name: string
  color: string | null
  emblem_url?: string | null
  captain: string | null
  captain_ehb: number | null
}

export interface DraftPreview {
  captains: DraftCaptain[]
  players: Player[]
}
