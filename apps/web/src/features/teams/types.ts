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
