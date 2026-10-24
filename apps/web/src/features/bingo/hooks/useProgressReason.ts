import { useSession } from '../../auth/hooks/useSession'
import { useOwnTeamStatus } from '../../teams/hooks/useOwnTeamStatus'

/** Why the viewer can't see team progress (feature 025, FR-003); an i18n key. */
export function useProgressReason(eventId: string): string {
  const session = useSession()
  const status = useOwnTeamStatus(eventId)
  if (!session.data) return 'board.progress.login'
  if (status.kind === 'notRegistered') return 'board.progress.notRegistered'
  if (status.kind === 'pending') return 'board.progress.pending'
  if (status.kind === 'removed') return 'board.progress.removed'
  if (status.kind === 'unassigned') return 'board.progress.unassigned'
  return 'board.progress.unavailable'
}
