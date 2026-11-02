import { useQuery } from '@tanstack/react-query'
import { fetchOwnTeamHome } from '../api/teamHomeApi'

/** Re-read the team page every minute while it's open (FR-006). */
export const TEAM_HOME_REFRESH_MS = 60_000

/** The viewer's own team page; only enabled for approved players with a team. */
export function useOwnTeamHome(eventId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['team-home', eventId],
    queryFn: () => fetchOwnTeamHome(eventId!),
    enabled: enabled && Boolean(eventId),
    refetchInterval: TEAM_HOME_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
