import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateEvent,
  createEvent,
  fetchEventReadiness,
  fetchEvents,
  finishEvent,
  updateEvent,
  updateEventRules,
  addRulesAddendum,
  setLateJoin,
} from '../api/eventsApi'
import type { EventPayload, EventStatus } from '../types'

export const EVENT_QUERY_KEY = ['events'] as const

export function useEvents(status?: EventStatus | EventStatus[]) {
  return useQuery({
    queryKey: [...EVENT_QUERY_KEY, status ? [status].flat().join(',') : 'all'],
    queryFn: () => fetchEvents(status),
  })
}

/** Preparation checklist of a draft event (073); `null` skips the request. */
export function useEventReadiness(eventId: string | null) {
  return useQuery({
    queryKey: [...EVENT_QUERY_KEY, 'readiness', eventId],
    queryFn: () => fetchEventReadiness(eventId!),
    enabled: Boolean(eventId),
  })
}

export function useEventMutations() {
  const queryClient = useQueryClient()
  const refreshEvents = () => queryClient.invalidateQueries({ queryKey: EVENT_QUERY_KEY })

  return {
    createEvent: useMutation({ mutationFn: createEvent, onSuccess: refreshEvents }),
    updateEvent: useMutation({
      mutationFn: ({ eventId, payload }: { eventId: string; payload: EventPayload }) =>
        updateEvent(eventId, payload),
      onSuccess: refreshEvents,
    }),
    updateRules: useMutation({ mutationFn: updateEventRules, onSuccess: refreshEvents }),
    addAddendum: useMutation({ mutationFn: addRulesAddendum, onSuccess: refreshEvents }),
    setLateJoin: useMutation({ mutationFn: setLateJoin, onSuccess: refreshEvents }),
    activateEvent: useMutation({ mutationFn: activateEvent, onSuccess: refreshEvents }),
    finishEvent: useMutation({ mutationFn: finishEvent, onSuccess: refreshEvents }),
  }
}
