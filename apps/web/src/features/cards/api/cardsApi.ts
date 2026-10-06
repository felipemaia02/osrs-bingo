import { apiClient } from '../../../lib/api'
import type {
  CardCreatePayload,
  CardDetail,
  CardRevisionPayload,
  CardSummary,
  WikiImage,
  WorkbookImportResult,
} from '../types'

export async function fetchCards(includeRetired = false): Promise<CardSummary[]> {
  const response = await apiClient.get<{ items: CardSummary[] }>('/admin/cards', {
    params: { include_retired: includeRetired },
  })
  return response.data.items
}

export async function createCard(payload: CardCreatePayload): Promise<CardDetail> {
  return (await apiClient.post<CardDetail>('/admin/cards', payload)).data
}

export async function createCardRevision({
  cardId,
  expectedRevision,
  payload,
}: {
  cardId: string
  expectedRevision: number
  payload: CardRevisionPayload
}): Promise<CardDetail> {
  return (
    await apiClient.post<CardDetail>(`/admin/cards/${cardId}/revisions`, {
      ...payload,
      expected_revision: expectedRevision,
    })
  ).data
}

export async function retireCard({
  cardId,
  expectedRevision,
}: {
  cardId: string
  expectedRevision: number
}): Promise<CardDetail> {
  return (
    await apiClient.post<CardDetail>(`/admin/cards/${cardId}/retire`, {
      expected_revision: expectedRevision,
      reason: 'Retired by administrator',
    })
  ).data
}

export async function importWorkbookCatalog(): Promise<WorkbookImportResult> {
  return (await apiClient.post<WorkbookImportResult>('/admin/cards/import-workbook')).data
}

export async function resolveWikiImage(articleTitle: string): Promise<WikiImage> {
  return (
    await apiClient.post<WikiImage>('/admin/wiki-images/resolve', {
      article_title: articleTitle,
    })
  ).data
}
