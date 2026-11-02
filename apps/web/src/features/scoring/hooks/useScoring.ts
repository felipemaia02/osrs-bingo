import { useQuery } from '@tanstack/react-query'
import { fetchOwnTeamScore, fetchRanking } from '../api/scoringApi'

const SCORING_KEY = ['scoring'] as const

/** The viewer's own team score; players without a team get a 403 and see no progress.
 * `refreshMs` re-reads it while a page stays open (team page, feature 050). */
export function useOwnTeamScore(eventId: string | null, enabled: boolean, refreshMs?: number) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'own', eventId],
    queryFn: () => fetchOwnTeamScore(eventId!),
    enabled: enabled && Boolean(eventId),
    refetchInterval: refreshMs,
    retry: false,
  })
}

export function useRanking(eventId: string | null) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'ranking', eventId],
    queryFn: () => fetchRanking(eventId!),
    enabled: Boolean(eventId),
  })
}
