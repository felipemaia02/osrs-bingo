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
  calculated_at: string
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
