export type EventStatus = 'draft' | 'active' | 'finished'

export interface BingoEvent {
  id: string
  name: string
  description: string | null
  start_at: string
  end_at: string
  status: EventStatus
  /** The event's written rules (feature 019); null when not written. */
  rules_text?: string | null
  /** Free text such as "5M gp" (feature 022); null when the event has no buy-in. */
  buy_in?: string | null
  created_at: string
  updated_at: string
}

export interface EventPayload {
  name: string
  description: string | null
  start_at: string
  end_at: string
  buy_in: string | null
}

export interface EventListResponse {
  items: BingoEvent[]
}

export interface EventRules {
  rules_text: string | null
}
