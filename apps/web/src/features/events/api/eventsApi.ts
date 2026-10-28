import { apiClient } from '../../../lib/api'
import type { BingoEvent, EventListResponse, EventPayload, EventRules, EventStatus } from '../types'

export async function fetchEvents(status?: EventStatus): Promise<BingoEvent[]> {
  const response = await apiClient.get<EventListResponse>('/events', { params: { status } })
  return response.data.items
}

/** Events the logged-in player is in (pending or approved), feature 026. */
export async function fetchMyEvents(): Promise<BingoEvent[]> {
  return (await apiClient.get<EventListResponse>('/events/mine')).data.items
}

export async function createEvent(payload: EventPayload): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>('/events', payload)
  return response.data
}

export async function updateEvent(eventId: string, payload: EventPayload): Promise<BingoEvent> {
  const response = await apiClient.patch<BingoEvent>(`/events/${eventId}`, payload)
  return response.data
}

export async function updateEventRules({
  eventId,
  rules,
}: {
  eventId: string
  rules: EventRules
}): Promise<BingoEvent> {
  return (await apiClient.patch<BingoEvent>(`/events/${eventId}/rules`, rules)).data
}

export async function activateEvent(eventId: string): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>(`/events/${eventId}/activate`)
  return response.data
}

export async function finishEvent(eventId: string): Promise<BingoEvent> {
  const response = await apiClient.post<BingoEvent>(`/events/${eventId}/finish`)
  return response.data
}

/** Adds a dated clarification to the rules of the active event (feature 036). */
export async function addRulesAddendum({
  eventId,
  text,
}: {
  eventId: string
  text: string
}): Promise<BingoEvent> {
  return (await apiClient.post<BingoEvent>(`/events/${eventId}/rules/addenda`, { text })).data
}
