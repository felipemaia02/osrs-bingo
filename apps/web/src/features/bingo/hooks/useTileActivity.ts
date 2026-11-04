import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminTeamActivity,
  fetchTeamActivity,
  startWorking,
  stopWorking,
} from '../api/activityApi'

const ACTIVITY_KEY = ['tile-activity'] as const
// Teammates' marks show up within a minute without reloading (feature 061, FR-005).
const REFRESH_MS = 60_000

export function useTeamActivity(eventId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...ACTIVITY_KEY, eventId],
    queryFn: () => fetchTeamActivity(eventId!),
    enabled: enabled && Boolean(eventId),
    refetchInterval: REFRESH_MS,
    retry: false,
  })
}

export function useAdminTeamActivity(eventId: string, teamId: string) {
  return useQuery({
    queryKey: [...ACTIVITY_KEY, 'admin', eventId, teamId],
    queryFn: () => fetchAdminTeamActivity(eventId, teamId),
  })
}

/** Marks or unmarks the viewer; the answer is the team's new list. */
export function useToggleWorking(eventId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ position, working }: { position: number; working: boolean }) =>
      working ? startWorking(eventId, position) : stopWorking(eventId, position),
    onSuccess: (activity) => client.setQueryData([...ACTIVITY_KEY, eventId], activity),
  })
}
