import { useSession } from '../../auth/hooks/useSession'
import { useEvents } from '../../events/hooks/useEvents'
import { useOwnRegistration } from '../../teams/hooks/useTeams'

export const REVIEW_ROLES = new Set(['captain', 'reviewer'])

/** Who can review: admins, and the captains and reviewers of the active event, who only see
 * the other teams' submissions (feature 064). */
export function useReviewAccess() {
  const session = useSession()
  const events = useEvents('active')
  const active = events.data?.find((event) => event.status === 'active') ?? null
  const isAdmin = session.data?.is_admin === true
  const registration = useOwnRegistration(
    active?.id ?? '',
    active && !isAdmin ? session.data?.id : undefined,
  )
  const own = registration.data
  const teamReviewer =
    !isAdmin &&
    own?.status === 'approved' &&
    Boolean(own.team_id) &&
    REVIEW_ROLES.has(own.role ?? '')
  return {
    isAdmin,
    teamReviewer,
    canReview: isAdmin || teamReviewer,
    activeEventId: active?.id ?? null,
    loading: session.isLoading || events.isLoading || registration.isLoading,
  }
}
