export type EventStatus = 'draft' | 'active' | 'finished'

export interface BingoEvent {
  id: string
  name: string
  description: string | null
  start_at: string
  end_at: string
  status: EventStatus
  /** Points per completed row/column (feature 006); null until set. */
  row_bonus?: number | null
  column_bonus?: number | null
  created_at: string
  updated_at: string
}

export interface EventPayload {
  name: string
  description: string | null
  start_at: string
  end_at: string
}

export interface EventListResponse {
  items: BingoEvent[]
}

export interface EventRules {
  row_bonus: number
  column_bonus: number
}
