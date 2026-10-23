import { apiClient } from '../../../lib/api'
import type { Ranking, TeamScore } from '../types'

export async function fetchOwnTeamScore(eventId: string): Promise<TeamScore> {
  return (await apiClient.get<TeamScore>(`/events/${eventId}/score/me`)).data
}

export async function fetchRanking(eventId: string): Promise<Ranking> {
  return (await apiClient.get<Ranking>(`/admin/events/${eventId}/ranking`)).data
}
