import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePlayer,
  approveAllPlayers,
  removePlayer,
  fetchOwnRegistration,
  createPlayer,
  createTeam,
  fetchPlayers,
  fetchTeams,
  updatePlayer,
} from '../api/teamsApi'

export function useTeams(eventId: string | null) {
  return useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => fetchTeams(eventId!),
    enabled: Boolean(eventId),
  })
}

export function usePlayers(eventId: string | null) {
  return useQuery({
    queryKey: ['players', eventId],
    queryFn: () => fetchPlayers(eventId!),
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
    createPlayer: useMutation({ mutationFn: createPlayer, onSuccess: refresh }),
    approvePlayer: useMutation({ mutationFn: approvePlayer, onSuccess: refresh }),
    approveAllPlayers: useMutation({ mutationFn: approveAllPlayers, onSuccess: refresh }),
    removePlayer: useMutation({ mutationFn: removePlayer, onSuccess: refresh }),
    updatePlayer: useMutation({ mutationFn: updatePlayer, onSuccess: refresh }),
  }
}

export function useOwnRegistration(eventId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['registration', eventId, userId],
    queryFn: () => fetchOwnRegistration(eventId),
    enabled: Boolean(userId),
  })
}
