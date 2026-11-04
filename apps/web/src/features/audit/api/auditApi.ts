import { apiClient } from '../../../lib/api'
import type { AuditFilters, AuditPage } from '../types'

export const AUDIT_PAGE_SIZE = 50
const END_OF_DAY = 'T23:59:59.999'

/** Dates are the admin's local days, sent as UTC instants. */
function dayStart(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString()
}

function dayEnd(day: string): string {
  return new Date(`${day}${END_OF_DAY}`).toISOString()
}

export async function fetchAuditLog(filters: AuditFilters, cursor: string | null) {
  const params: Record<string, string | number> = { limit: AUDIT_PAGE_SIZE }
  if (filters.eventId) params.event_id = filters.eventId
  if (filters.group) params.group = filters.group
  if (filters.actor.trim()) params.actor = filters.actor.trim()
  if (filters.from) params.from = dayStart(filters.from)
  if (filters.to) params.to = dayEnd(filters.to)
  if (cursor) params.cursor = cursor
  return (await apiClient.get<AuditPage>('/admin/audit', { params })).data
}
