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
  buy_in_status?: 'pending' | 'paid' | null
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
