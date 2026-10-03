import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { activateEvent, createEvent, fetchEvents, finishEvent, updateEvent } from '../api/eventsApi'
import type { EventPayload, EventStatus } from '../types'

export const EVENT_QUERY_KEY = ['events'] as const

export function useEvents(status?: EventStatus) {
  return useQuery({
    queryKey: [...EVENT_QUERY_KEY, status ?? 'all'],
    queryFn: () => fetchEvents(status),
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
    activateEvent: useMutation({ mutationFn: activateEvent, onSuccess: refreshEvents }),
    finishEvent: useMutation({ mutationFn: finishEvent, onSuccess: refreshEvents }),
  }
}
