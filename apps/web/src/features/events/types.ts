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
  /** Dated clarifications added while the event is active (feature 036). */
  rules_addenda?: RulesAddendum[]
  /** Players may request to join while the event is active (feature 037). */
  late_join?: boolean
  /** Free text such as "5M gp" (feature 022); null when the event has no buy-in. */
  buy_in?: string | null
  /** When an admin finished the event (feature 071); null otherwise. */
  finished_at?: string | null
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

export interface RulesAddendum {
  text: string
  added_at: string
}

/** Preparation checklist of a draft event (feature 073). */
export type ReadinessKey =
  'board' | 'line_bonuses' | 'rules' | 'teams' | 'players_assigned' | 'captains' | 'no_pending'

export interface ReadinessItem {
  key: ReadinessKey
  done: boolean
  /** Activation is refused while a required item is missing. */
  required: boolean
}

export interface EventReadiness {
  items: ReadinessItem[]
  ready: boolean
}
