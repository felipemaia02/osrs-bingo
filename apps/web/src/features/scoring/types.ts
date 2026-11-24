import type { Estimate } from '../cards/types'
import type { EventStatus } from '../events/types'

export interface DropProgress {
  drop_key: string
  drop_name: string
  count: number
  progress: number
}

export interface TileProgressResponse {
  position: number
  row: number
  column: number
  bonus: boolean
  progress: number
  requirement: number
  complete: boolean
  points: number
  /** Kills and hours the team still needs (feature 060); null once complete. */
  remaining_estimate?: Estimate | null
  drops: DropProgress[]
}

export interface TeamScore {
  event_id: string
  team_id: string
  team_name: string
  team_color: string | null
  total: number
  tile_points: number
  completed_tiles: number
  tile_count: number
  bonus_points: number
  completed_bonus: number
  bonus_count: number
  completed_rows: number[]
  completed_columns: number[]
  row_points: number
  column_points: number
  row_bonus: number | null
  column_bonus: number | null
  tiles: TileProgressResponse[]
  /** Feature 070: the most the board can give and the lines closest to their bonus. */
  max_total?: number
  closest_lines?: LineProgress[]
  calculated_at: string
}

export interface LineProgress {
  axis: 'row' | 'column'
  line: number
  completed: number
  total: number
  bonus: number | null
}

export interface RankingTeam {
  position: number
  tied: boolean
  team_id: string
  team_name: string
  team_color: string | null
  member_count: number
  total: number
  tile_points: number
  completed_tiles: number
  completed_rows: number
  row_points: number
  completed_columns: number
  column_points: number
  bonus_points: number
  completed_bonus: number
  /** Submissions of this team waiting for review (feature 077). */
  pending_submissions?: number
}

export interface PlayerContribution {
  player_id: string
  display_name: string
  team_id: string | null
  contribution: number
}

export interface Ranking {
  event_id: string
  event_name: string
  event_status: EventStatus
  size: number
  tile_count: number
  bonus_count: number
  row_bonus: number | null
  column_bonus: number | null
  teams: RankingTeam[]
  players: PlayerContribution[]
  calculated_at: string
}

/** Top 3 of a finished event, public for 7 days after it finishes (feature 071). */
export interface PodiumTeam {
  position: number
  tied: boolean
  team_id: string
  team_name: string
  team_color: string | null
  total: number
  completed_tiles: number
  members: string[]
}

export interface Podium {
  event_id: string
  event_name: string
  start_at: string
  end_at: string
  finished_at: string
  /** False while submissions still wait for review. */
  final: boolean
  teams: PodiumTeam[]
}
