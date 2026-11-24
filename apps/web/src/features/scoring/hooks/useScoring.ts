import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchOwnTeamScore, fetchPodium, fetchRanking, fetchTeamScore } from '../api/scoringApi'

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

export function useTeamScore(eventId: string, teamId: string) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'team', eventId, teamId],
    queryFn: () => fetchTeamScore(eventId, teamId),
  })
}

export function usePodium(eventId: string | null) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'podium', eventId],
    queryFn: () => fetchPodium(eventId!),
    enabled: Boolean(eventId),
    retry: false,
  })
}

/** Every team's board progress at once, for the admin tiles × teams matrix (077). */
export function useTeamScores(eventId: string, teamIds: string[]) {
  return useQueries({
    queries: teamIds.map((teamId) => ({
      queryKey: [...SCORING_KEY, 'team', eventId, teamId],
      queryFn: () => fetchTeamScore(eventId, teamId),
    })),
  })
}

export function useRanking(eventId: string | null) {
  return useQuery({
    queryKey: [...SCORING_KEY, 'ranking', eventId],
    queryFn: () => fetchRanking(eventId!),
    enabled: Boolean(eventId),
  })
}
