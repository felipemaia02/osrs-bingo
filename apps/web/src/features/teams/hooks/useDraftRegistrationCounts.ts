import { useQueries } from '@tanstack/react-query'
import { useEvents } from '../../events/hooks/useEvents'
import { fetchPlayers } from '../api/teamsApi'
import type { PlayerFilters } from '../types'

/** Only counts are needed: the response's event-wide counts don't depend on the page. */
const COUNTS_ONLY: PlayerFilters = { group: 'pending', search: '', offset: 0, limit: 1 }

export interface DraftRegistrationCounts {
  pending: number
  unassigned: number
}

/**
 * Pending and unassigned registrations summed across draft events, where registrations can
 * still change. Returns null while loading or when any read fails, so no partial number is shown.
 */
export function useDraftRegistrationCounts(enabled: boolean): DraftRegistrationCounts | null {
  const drafts = useEvents('draft')
  const draftIds = enabled ? (drafts.data ?? []).map((event) => event.id) : []
  const results = useQueries({
    queries: draftIds.map((eventId) => ({
      queryKey: ['players', eventId, COUNTS_ONLY],
      queryFn: () => fetchPlayers(eventId, COUNTS_ONLY),
    })),
  })
  if (!enabled || !drafts.isSuccess || results.some((result) => !result.isSuccess)) return null
  return results.reduce<DraftRegistrationCounts>(
    (total, result) => ({
      pending: total.pending + (result.data?.counts.pending ?? 0),
      unassigned: total.unassigned + (result.data?.counts.unassigned ?? 0),
    }),
    { pending: 0, unassigned: 0 },
  )
}
