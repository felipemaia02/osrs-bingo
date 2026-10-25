import { useQuery } from '@tanstack/react-query'
import { fetchOwnTeamScore, fetchRanking } from '../api/scoringApi'

const SCORING_KEY = ['scoring'] as const

/** The viewer's own team score; players without a team get a 403 and see no progress. */
export function useOwnTeamScore(eventId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'own', eventId],
    queryFn: () => fetchOwnTeamScore(eventId!),
    enabled: enabled && Boolean(eventId),
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
