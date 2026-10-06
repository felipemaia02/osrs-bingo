import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminBoard, fetchPublicBoard, saveBoard } from '../api/boardsApi'

export function useAdminBoard(eventId: string | null) {
  return useQuery({
    queryKey: ['boards', 'admin', eventId],
    queryFn: () => fetchAdminBoard(eventId!),
    enabled: Boolean(eventId),
  })
}

export function usePublicBoard(eventId: string | null) {
  return useQuery({
    queryKey: ['boards', 'public', eventId],
    queryFn: () => fetchPublicBoard(eventId!),
    enabled: Boolean(eventId),
  })
}

export function useSaveBoard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: saveBoard,
    onSuccess: async (board) => {
      await client.invalidateQueries({ queryKey: ['boards', 'admin', board.event_id] })
    },
  })
}
