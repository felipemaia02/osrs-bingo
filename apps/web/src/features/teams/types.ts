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
}

export interface TeamPayload {
  name: string
  color: string | null
}

export interface PlayerPayload {
  display_name: string
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
