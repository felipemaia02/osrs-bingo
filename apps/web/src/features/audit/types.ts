/** Audit log (feature 059). */
export const AUDIT_GROUPS = [
  'event',
  'registration',
  'team',
  'board',
  'card',
  'submission',
  'admin',
  'settings',
  'profile',
  'activity',
] as const

export type AuditGroup = (typeof AUDIT_GROUPS)[number]

export interface AuditActor {
  kind: 'user' | 'bot'
  id: string | null
  name: string
  on_behalf_of: string | null
}

/** One audited request: who, which action, on what, and the fields sent. */
export interface AuditEntry {
  id: string
  at: string
  action: string
  actor: AuditActor
  event_id: string | null
  team_id: string | null
  resource: { type: string; id: string | null; label: string | null }
  payload: Record<string, unknown>
}

export function groupOf(action: string): AuditGroup {
  return action.split('.')[0] as AuditGroup
}

export interface AuditPage {
  items: AuditEntry[]
  next_cursor: string | null
}

export interface AuditFilters {
  eventId: string
  group: AuditGroup | ''
  actor: string
  /** yyyy-mm-dd from a date input; empty = no limit. */
  from: string
  to: string
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  eventId: '',
  group: '',
  actor: '',
  from: '',
  to: '',
}
