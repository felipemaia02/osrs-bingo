import { apiClient } from '../../../lib/api'
import type {
  BingoEvent,
  EventListResponse,
  EventPayload,
  EventReadiness,
  EventRules,
  EventStatus,
} from '../types'

/** All events, or only those in the given statuses (`?status=` repeats, feature 068). */
export async function fetchEvents(status?: EventStatus | EventStatus[]): Promise<BingoEvent[]> {
  const params = new URLSearchParams()
  for (const value of [status ?? []].flat()) params.append('status', value)
  const response = await apiClient.get<EventListResponse>('/events', { params })
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

export async function updateEventRules({
  eventId,
  rules,
}: {
  eventId: string
  rules: EventRules
}): Promise<BingoEvent> {
  return (await apiClient.patch<BingoEvent>(`/events/${eventId}/rules`, rules)).data
}

/** What is done and missing before activating a draft event (feature 073). */
export async function fetchEventReadiness(eventId: string): Promise<EventReadiness> {
  return (await apiClient.get<EventReadiness>(`/events/${eventId}/readiness`)).data
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

/** Lets players join while the event is active (feature 037). */
export async function setLateJoin({
  eventId,
  enabled,
}: {
  eventId: string
  enabled: boolean
}): Promise<BingoEvent> {
  return (await apiClient.patch<BingoEvent>(`/events/${eventId}/late-join`, { enabled })).data
}
