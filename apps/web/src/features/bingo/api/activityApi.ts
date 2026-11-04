import { apiClient } from '../../../lib/api'
import type { TeamActivity } from '../types'

const ownTeam = (eventId: string) => `/events/${eventId}/my-team/activity`

export async function fetchTeamActivity(eventId: string): Promise<TeamActivity> {
  return (await apiClient.get<TeamActivity>(ownTeam(eventId))).data
}

export async function startWorking(eventId: string, position: number): Promise<TeamActivity> {
  return (await apiClient.put<TeamActivity>(`${ownTeam(eventId)}/${position}`)).data
}

export async function stopWorking(eventId: string, position: number): Promise<TeamActivity> {
  return (await apiClient.delete<TeamActivity>(`${ownTeam(eventId)}/${position}`)).data
}

/** Any team's marks, read-only, for the admin ranking board (058). */
export async function fetchAdminTeamActivity(
  eventId: string,
  teamId: string,
): Promise<TeamActivity> {
  return (await apiClient.get<TeamActivity>(`/admin/events/${eventId}/teams/${teamId}/activity`))
    .data
}
