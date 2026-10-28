import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePlayer,
  approveAllPlayers,
  approveSelectedPlayers,
  assignSelectedPlayers,
  removePlayer,
  removeSelectedPlayers,
  fetchOwnRegistration,
  createPlayer,
  createTeam,
  updateTeam,
  fetchPlayers,
  fetchDraftPreview,
  fetchTeamBalance,
  fetchTeams,
  updateParticipation,
  updatePlayer,
} from '../api/teamsApi'
import { fetchAdministrators } from '../../administration/api/administrationApi'

export function useTeams(eventId: string | null) {
  return useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => fetchTeams(eventId!),
    enabled: Boolean(eventId),
  })
}

/** Each team's experience versus the average (feature 023); refreshed with the teams. */
export function useTeamBalance(eventId: string | null) {
  return useQuery({
    queryKey: ['teams', eventId, 'balance'],
    queryFn: () => fetchTeamBalance(eventId!),
    enabled: Boolean(eventId),
  })
}

const DRAFT_REFRESH_MS = 30_000

/** Draft preview, re-read every 30 s and on focus so assigned players drop out (feature 024). */
export function useDraftPreview(eventId: string | null) {
  return useQuery({
    queryKey: ['teams', eventId, 'draft-preview'],
    queryFn: () => fetchDraftPreview(eventId!),
    enabled: Boolean(eventId),
    refetchInterval: DRAFT_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

export function useAdministrators(enabled: boolean) {
  return useQuery({ queryKey: ['administrators'], queryFn: fetchAdministrators, enabled })
}

export function usePlayers(eventId: string | null, filters: import('../types').PlayerFilters) {
  return useQuery({
    queryKey: ['players', eventId, filters],
    queryFn: () => fetchPlayers(eventId!, filters),
    enabled: Boolean(eventId),
  })
}

export function useTeamMutations() {
  const client = useQueryClient()
  const refresh = async (_result: unknown, { eventId }: { eventId: string }) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['teams', eventId] }),
      client.invalidateQueries({ queryKey: ['players', eventId] }),
      client.invalidateQueries({ queryKey: ['registration', eventId] }),
    ])
  }
  return {
    createTeam: useMutation({ mutationFn: createTeam, onSuccess: refresh }),
    updateTeam: useMutation({ mutationFn: updateTeam, onSuccess: refresh }),
    createPlayer: useMutation({ mutationFn: createPlayer, onSuccess: refresh }),
    approvePlayer: useMutation({ mutationFn: approvePlayer, onSuccess: refresh }),
    approveAllPlayers: useMutation({ mutationFn: approveAllPlayers, onSuccess: refresh }),
    removePlayer: useMutation({ mutationFn: removePlayer, onSuccess: refresh }),
    approveSelectedPlayers: useMutation({ mutationFn: approveSelectedPlayers, onSuccess: refresh }),
    removeSelectedPlayers: useMutation({ mutationFn: removeSelectedPlayers, onSuccess: refresh }),
    assignSelectedPlayers: useMutation({ mutationFn: assignSelectedPlayers, onSuccess: refresh }),
    updatePlayer: useMutation({ mutationFn: updatePlayer, onSuccess: refresh }),
    updateParticipation: useMutation({ mutationFn: updateParticipation, onSuccess: refresh }),
  }
}

export function useOwnRegistration(eventId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['registration', eventId, userId],
    queryFn: () => fetchOwnRegistration(eventId),
    enabled: Boolean(userId),
  })
}
