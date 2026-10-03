import { apiClient } from '../../../lib/api'
import type { BingoEvent, EventListResponse, EventPayload, EventStatus } from '../types'

export async function fetchEvents(status?: EventStatus): Promise<BingoEvent[]> {
  const response = await apiClient.get<EventListResponse>('/events', { params: { status } })
  return response.data.items
}

export async function createEvent(payload: EventPayload): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>('/events', payload)
  return response.data
}

export async function updateEvent(eventId: string, payload: EventPayload): Promise<BingoEvent> {
  const response = await apiClient.patch<BingoEvent>(`/events/${eventId}`, payload)
  return response.data
}

export async function activateEvent(eventId: string): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>(`/events/${eventId}/activate`)
  return response.data
}

export async function finishEvent(eventId: string): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>(`/events/${eventId}/finish`)
  return response.data
}
