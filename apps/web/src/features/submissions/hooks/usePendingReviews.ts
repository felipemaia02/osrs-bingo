import { useEvents } from '../../events/hooks/useEvents'
import { usePendingReviewCount } from './useSubmissions'

/** Pending submissions of the active event, for the shell badge and the overview. */
export function usePendingReviews(isAdmin: boolean): number | null {
  const events = useEvents('active')
  const active = events.data?.find((event) => event.status === 'active') ?? null
  const count = usePendingReviewCount(active?.id ?? null, isAdmin)
  return count.data ?? null
}
