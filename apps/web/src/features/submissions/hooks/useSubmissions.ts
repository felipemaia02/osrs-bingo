import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptSubmission,
  createSubmission,
  fetchOwnSubmissions,
  fetchReviewQueue,
  rejectSubmission,
} from '../api/submissionsApi'
import type { SubmissionKind } from '../types'

const SUBMISSIONS_KEY = ['submissions'] as const
export const REVIEW_PAGE_SIZE = 50

export function useOwnSubmissions(eventId: string | null) {
  return useQuery({
    queryKey: [...SUBMISSIONS_KEY, 'own', eventId],
    queryFn: () => fetchOwnSubmissions(eventId!),
    enabled: Boolean(eventId),
  })
}

export function useSubmit() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: () => client.invalidateQueries({ queryKey: SUBMISSIONS_KEY }),
  })
}

export function useReviewQueue(eventId: string | null, kind: SubmissionKind | null) {
  return useQuery({
    queryKey: [...SUBMISSIONS_KEY, 'review', eventId, kind],
    queryFn: () => fetchReviewQueue(eventId!, kind, REVIEW_PAGE_SIZE),
    enabled: Boolean(eventId),
  })
}

/** Pending review count for the shell and overview (one tiny request). */
export function usePendingReviewCount(eventId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...SUBMISSIONS_KEY, 'review', eventId, 'count'],
    queryFn: () => fetchReviewQueue(eventId!, null, 1),
    enabled: enabled && Boolean(eventId),
    select: (queue) => queue.counts.pending,
  })
}

export function useReviewActions() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: SUBMISSIONS_KEY })
  return {
    accept: useMutation({ mutationFn: acceptSubmission, onSuccess: refresh }),
    reject: useMutation({ mutationFn: rejectSubmission, onSuccess: refresh }),
  }
}
