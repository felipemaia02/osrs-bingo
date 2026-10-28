import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCard,
  createCardRevision,
  fetchCards,
  importWorkbookCatalog,
  linkCatalogItems,
  previewDropMatches,
  resolveWikiImage,
  retireCard,
  searchItems,
  uploadCardArtwork,
} from '../api/cardsApi'
import type { DropMatchInput } from '../types'

export const ITEM_SEARCH_MIN_LENGTH = 2
// The item list changes weekly at most; repeated searches can reuse answers.
const ITEM_SEARCH_STALE_MS = 10 * 60 * 1000

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
    uploadArtwork: useMutation({ mutationFn: uploadCardArtwork }),
    linkItems: useMutation({ mutationFn: linkCatalogItems, onSuccess: refresh }),
  }
}

export function useItemSearch(query: string) {
  const text = query.trim()
  return useQuery({
    queryKey: ['osrs-items', text.toLocaleLowerCase()],
    queryFn: () => searchItems(text),
    enabled: text.length >= ITEM_SEARCH_MIN_LENGTH,
    staleTime: ITEM_SEARCH_STALE_MS,
  })
}

export function useDropMatchPreview(drops: DropMatchInput[]) {
  return useQuery({
    queryKey: ['drop-match-preview', drops],
    queryFn: () => previewDropMatches(drops),
    enabled: drops.length > 0,
    placeholderData: keepPreviousData,
  })
}
