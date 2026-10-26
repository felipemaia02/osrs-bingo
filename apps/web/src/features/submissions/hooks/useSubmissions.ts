import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptSubmission,
  createSubmission,
  fetchOwnSubmissions,
  fetchReviewQueue,
  fetchTileHistory,
  rejectSubmission,
  revertSubmission,
} from '../api/submissionsApi'
import type { ReviewStatus, SubmissionKind } from '../types'

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

export function useReviewQueue(
  eventId: string | null,
  kind: SubmissionKind | null,
  status: ReviewStatus = 'pending',
  search = '',
) {
  return useQuery({
    queryKey: [...SUBMISSIONS_KEY, 'review', eventId, kind, status, search.trim()],
    queryFn: () => fetchReviewQueue(eventId!, kind, REVIEW_PAGE_SIZE, status, search),
    enabled: Boolean(eventId),
  })
}

export function useTileHistory(submissionId: string | null) {
  return useQuery({
    queryKey: [...SUBMISSIONS_KEY, 'tile-history', submissionId],
    queryFn: () => fetchTileHistory(submissionId!),
    enabled: Boolean(submissionId),
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
    revert: useMutation({ mutationFn: revertSubmission, onSuccess: refresh }),
  }
}
