import { useSession } from '../../auth/hooks/useSession'
import type { Team } from '../types'
import { useOwnRegistration, useTeams } from './useTeams'

export type OwnTeamStatus =
  | { kind: 'hidden' }
  | { kind: 'notRegistered' | 'pending' | 'removed' | 'unassigned' }
  | { kind: 'team'; team: Team }

/**
 * The viewer's own registration in an event, reduced to what the board shows. Anonymous
 * visitors and failed reads are "hidden": the page shows no team information (own team only).
 */
export function useOwnTeamStatus(eventId: string): OwnTeamStatus {
  const session = useSession()
  const registration = useOwnRegistration(eventId, session.data?.id)
  const teamId =
    registration.data?.status === 'approved' ? (registration.data.team_id ?? null) : null
  const teams = useTeams(teamId ? eventId : null)

  if (!session.data || registration.isLoading || registration.isError) return { kind: 'hidden' }
  if (!registration.data) return { kind: 'notRegistered' }
  if (registration.data.status === 'pending') return { kind: 'pending' }
  if (registration.data.status === 'removed') return { kind: 'removed' }
  if (!teamId) return { kind: 'unassigned' }
  const team = teams.data?.find((candidate) => candidate.id === teamId)
  return team ? { kind: 'team', team } : { kind: 'hidden' }
}
