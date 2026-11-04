import { AxiosError } from 'axios'
import { apiClient } from '../../../lib/api'
import type { BoardSavePayload, EventBoard } from '../types'

export async function fetchAdminBoard(eventId: string): Promise<EventBoard | null> {
  try {
    return (await apiClient.get<EventBoard>(`/admin/events/${eventId}/board`)).data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) return null
    throw error
  }
}

export async function fetchPublicBoard(eventId: string): Promise<EventBoard | null> {
  try {
    return (await apiClient.get<EventBoard>(`/events/${eventId}/board`)).data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) return null
    throw error
  }
}

export async function saveBoard({
  eventId,
  payload,
}: {
  eventId: string
  payload: BoardSavePayload
}): Promise<EventBoard> {
  return (await apiClient.put<EventBoard>(`/admin/events/${eventId}/board`, payload)).data
}

/** Fix a live square with a newer revision of its card (feature 036). */
export async function updateBoardPosition({
  eventId,
  position,
  cardRevision,
  reason,
}: {
  eventId: string
  position: number
  cardRevision: number
  reason: string
}): Promise<EventBoard> {
  return (
    await apiClient.put<EventBoard>(`/admin/events/${eventId}/board/positions/${position}`, {
      card_revision: cardRevision,
      reason,
    })
  ).data
}

/** Every square of the live board to its card's latest revision, one reason (feature 067). */
export async function updateAllBoardCards({
  eventId,
  reason,
}: {
  eventId: string
  reason: string
}): Promise<EventBoard> {
  return (
    await apiClient.post<EventBoard>(`/admin/events/${eventId}/board/update-cards`, { reason })
  ).data
}
