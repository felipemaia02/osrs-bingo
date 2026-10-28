import type { RulesAddendum } from './types'

/** Whether an event has anything to show: written rules or clarifications (feature 036). */
export function hasRules(event: { rules_text?: string | null; rules_addenda?: RulesAddendum[] }) {
  return Boolean(event.rules_text) || Boolean(event.rules_addenda?.length)
}
