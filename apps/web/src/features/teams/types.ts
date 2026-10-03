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
