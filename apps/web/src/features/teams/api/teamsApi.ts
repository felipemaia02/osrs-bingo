import { apiClient } from '../../../lib/api'
import type { Player, PlayerAssignmentPayload, PlayerPayload, Team, TeamPayload } from '../types'

export const fetchTeams = async (eventId: string) =>
  (await apiClient.get<{ items: Team[] }>(`/events/${eventId}/teams`)).data.items
export const createTeam = async ({ eventId, payload }: { eventId: string; payload: TeamPayload }) =>
  (await apiClient.post<Team>(`/events/${eventId}/teams`, payload)).data
export const fetchPlayers = async (eventId: string) =>
  (await apiClient.get<{ items: Player[] }>(`/events/${eventId}/players`)).data.items
export const createPlayer = async ({
  eventId,
  payload,
}: {
  eventId: string
  payload: PlayerPayload
}) => (await apiClient.post<Player>(`/events/${eventId}/players`, payload)).data
export const updatePlayer = async ({
  eventId,
  playerId,
  payload,
}: {
  eventId: string
  playerId: string
  payload: PlayerAssignmentPayload
}) => (await apiClient.patch<Player>(`/events/${eventId}/players/${playerId}`, payload)).data

export const fetchOwnRegistration = async (eventId: string) =>
  (await apiClient.get<Player | null>(`/events/${eventId}/players/me`)).data
export const approvePlayer = async ({ eventId, playerId }: { eventId: string; playerId: string }) =>
  (await apiClient.post<Player>(`/events/${eventId}/players/${playerId}/approve`)).data
export const approveAllPlayers = async ({ eventId }: { eventId: string }) =>
  (await apiClient.post<{ approved_count: number }>(`/events/${eventId}/players/approve-all`)).data
export const removePlayer = async ({ eventId, playerId }: { eventId: string; playerId: string }) =>
  (await apiClient.delete<Player>(`/events/${eventId}/players/${playerId}`)).data
