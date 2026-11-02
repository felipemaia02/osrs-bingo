import { apiClient } from '../../../lib/api'
import type { TeamHome } from '../types'

export async function fetchOwnTeamHome(eventId: string): Promise<TeamHome> {
  return (await apiClient.get<TeamHome>(`/events/${eventId}/team/me`)).data
}
