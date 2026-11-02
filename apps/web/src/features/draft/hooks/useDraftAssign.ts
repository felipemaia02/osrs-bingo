import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePlayer } from '../../teams/api/teamsApi'
import type { DraftPreview } from '../../teams/types'
import { moveInDraft } from '../rosters'

export interface DraftPick {
  playerId: string
  teamId: string | null
}

/** Pick from the draft preview (049, FR-005): the player moves at once and goes back if the
 * save fails; the preview, balance and roster are re-read afterwards. */
export function useDraftAssign(eventId: string) {
  const client = useQueryClient()
  const key = ['teams', eventId, 'draft-preview']
  return useMutation({
    mutationFn: ({ playerId, teamId }: DraftPick) =>
      updatePlayer({ eventId, playerId, payload: { team_id: teamId } }),
    onMutate: async ({ playerId, teamId }: DraftPick) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<DraftPreview>(key)
      if (previous) client.setQueryData(key, moveInDraft(previous, playerId, teamId))
      return { previous }
    },
    onError: (_error, _pick, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['teams', eventId] }),
        client.invalidateQueries({ queryKey: ['players', eventId] }),
      ]),
  })
}
