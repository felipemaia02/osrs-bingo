import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCard,
  createCardRevision,
  fetchCards,
  importWorkbookCatalog,
  resolveWikiImage,
  retireCard,
} from '../api/cardsApi'

export const CARD_QUERY_KEY = ['cards'] as const

export function useCards(includeRetired = false) {
  return useQuery({
    queryKey: [...CARD_QUERY_KEY, includeRetired],
    queryFn: () => fetchCards(includeRetired),
  })
}

export function useCardMutations() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: CARD_QUERY_KEY })
  return {
    create: useMutation({ mutationFn: createCard, onSuccess: refresh }),
    revise: useMutation({ mutationFn: createCardRevision, onSuccess: refresh }),
    retire: useMutation({ mutationFn: retireCard, onSuccess: refresh }),
    importWorkbook: useMutation({ mutationFn: importWorkbookCatalog, onSuccess: refresh }),
    resolveImage: useMutation({ mutationFn: resolveWikiImage }),
  }
}
