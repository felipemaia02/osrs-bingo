import type { DraftAssignment } from '../../draft/session'
import type { ProgressionTier, TierInfo } from '../../profiles/tier'
import { apiClient } from '../../../lib/api'
import type {
  PlayerFilters,
  PlayerPage,
  Player,
  JoinPayload,
  ParticipationPayload,
  SelectionResult,
  Team,
  TeamBalanceResponse,
  DraftPreview,
  DraftSaveResult,
  TeamPayload,
} from '../types'

export const fetchTeams = async (eventId: string) =>
  (await apiClient.get<{ items: Team[] }>(`/events/${eventId}/teams`)).data.items
export const createTeam = async ({ eventId, payload }: { eventId: string; payload: TeamPayload }) =>
  (await apiClient.post<Team>(`/events/${eventId}/teams`, payload)).data
export const updateTeam = async ({
  eventId,
  teamId,
  payload,
}: {
  eventId: string
  teamId: string
  payload: TeamPayload
}) => (await apiClient.patch<Team>(`/events/${eventId}/teams/${teamId}`, payload)).data
export const fetchPlayers = async (eventId: string, filters: PlayerFilters) =>
  (await apiClient.get<PlayerPage>(`/events/${eventId}/players`, { params: filters })).data
export const createPlayer = async ({
  eventId,
  payload,
}: {
  eventId: string
  payload: JoinPayload
}) => (await apiClient.post<Player>(`/events/${eventId}/players`, payload)).data
export const fetchOwnRegistration = async (eventId: string) =>
  (await apiClient.get<Player | null>(`/events/${eventId}/players/me`)).data
export const approvePlayer = async ({ eventId, playerId }: { eventId: string; playerId: string }) =>
  (await apiClient.post<Player>(`/events/${eventId}/players/${playerId}/approve`)).data
export const approveAllPlayers = async ({ eventId }: { eventId: string }) =>
  (await apiClient.post<{ approved_count: number }>(`/events/${eventId}/players/approve-all`)).data
export const removePlayer = async ({ eventId, playerId }: { eventId: string; playerId: string }) =>
  (await apiClient.delete<Player>(`/events/${eventId}/players/${playerId}`)).data

type SelectionRequest = { eventId: string; playerIds: string[] }

export const approveSelectedPlayers = async ({ eventId, playerIds }: SelectionRequest) =>
  (
    await apiClient.post<SelectionResult>(`/events/${eventId}/players/approve-selected`, {
      player_ids: playerIds,
    })
  ).data
export const removeSelectedPlayers = async ({ eventId, playerIds }: SelectionRequest) =>
  (
    await apiClient.post<SelectionResult>(`/events/${eventId}/players/remove-selected`, {
      player_ids: playerIds,
    })
  ).data

export const fetchTeamBalance = async (eventId: string) =>
  (await apiClient.get<TeamBalanceResponse>(`/events/${eventId}/teams/balance`)).data

export const updateParticipation = async ({
  eventId,
  playerId,
  payload,
}: {
  eventId: string
  playerId: string
  payload: ParticipationPayload
}) =>
  (await apiClient.patch<Player>(`/events/${eventId}/players/${playerId}/participation`, payload))
    .data

/** Feature 069: the admin's tier for the player; null goes back to the WOM suggestion. */
export const setPlayerTier = async ({
  eventId,
  playerId,
  tier,
}: {
  eventId: string
  playerId: string
  tier: ProgressionTier | null
}) => (await apiClient.put<TierInfo>(`/events/${eventId}/players/${playerId}/tier`, { tier })).data

/** Every draft-board change at once (feature 076); players changed meanwhile come back
 * in `skipped`. */
export const saveDraft = async ({
  eventId,
  assignments,
}: {
  eventId: string
  assignments: DraftAssignment[]
}) =>
  (await apiClient.post<DraftSaveResult>(`/events/${eventId}/players/draft`, { assignments })).data

export const fetchDraftPreview = async (eventId: string) =>
  (await apiClient.get<DraftPreview>(`/events/${eventId}/teams/draft-preview`)).data
