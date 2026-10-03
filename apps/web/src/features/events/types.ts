export type EventStatus = 'draft' | 'active' | 'finished'

export interface BingoEvent {
  id: string
  name: string
  description: string | null
  start_at: string
  end_at: string
  status: EventStatus
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
