import type { Activity } from '../profiles/types'
import type { ParticipantRole } from '../teams/types'

/** A member of the viewer's own team with their points in it (feature 050). */
export interface TeamMember {
  player_id: string
  display_name: string
  discord_username: string | null
  role: ParticipantRole | null
  timezone: string | null
  activity: Activity | null
  position: number
  tied: boolean
  points: number
  drop_count: number
}

/** One of the team's newest accepted drops and the points it gave its player. */
export interface TeamDrop {
  submission_id: string
  player_name: string
  card_name: string
  drop_name: string | null
  quantity: number
  points: number
  accepted_at: string
}

export interface TeamHome {
  event_id: string
  team_id: string
  team_name: string
  team_color: string | null
  emblem_url: string | null
  members: TeamMember[]
  recent_drops: TeamDrop[]
}
