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
