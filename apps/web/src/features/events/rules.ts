import type { BingoEvent, RulesAddendum } from './types'

/** Whether an event has anything to show: written rules or clarifications (feature 036). */
export function hasRules(event: { rules_text?: string | null; rules_addenda?: RulesAddendum[] }) {
  return Boolean(event.rules_text) || Boolean(event.rules_addenda?.length)
}

/** Whether players can request to join: drafts, or active events with late join (037). */
export function canJoin(event: Pick<BingoEvent, 'status' | 'late_join'>) {
  return event.status === 'draft' || (event.status === 'active' && Boolean(event.late_join))
}
