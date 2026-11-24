import { apiClient } from '../../../lib/api'
import type { Podium, Ranking, TeamScore } from '../types'

export async function fetchOwnTeamScore(eventId: string): Promise<TeamScore> {
  return (await apiClient.get<TeamScore>(`/events/${eventId}/score/me`)).data
}

/** Any team's board progress, for admins (feature 058). */
export async function fetchTeamScore(eventId: string, teamId: string): Promise<TeamScore> {
  return (await apiClient.get<TeamScore>(`/admin/events/${eventId}/teams/${teamId}/score`)).data
}

/** Public podium (071); 404 outside the 7 days after the event finished. */
export async function fetchPodium(eventId: string): Promise<Podium> {
  return (await apiClient.get<Podium>(`/events/${eventId}/podium`)).data
}

export async function fetchRanking(eventId: string): Promise<Ranking> {
  return (await apiClient.get<Ranking>(`/admin/events/${eventId}/ranking`)).data
}
