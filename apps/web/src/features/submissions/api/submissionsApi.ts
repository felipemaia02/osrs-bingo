import { apiClient } from '../../../lib/api'
import type {
  OwnSubmissions,
  RejectPayload,
  ReviewQueue,
  Submission,
  SubmissionKind,
  SubmitPayload,
} from '../types'

export async function fetchOwnSubmissions(eventId: string): Promise<OwnSubmissions> {
  return (await apiClient.get<OwnSubmissions>(`/events/${eventId}/submissions/me`)).data
}

export async function createSubmission({
  eventId,
  payload,
}: {
  eventId: string
  payload: SubmitPayload
}): Promise<Submission> {
  const form = new FormData()
  form.append('kind', payload.kind)
  form.append('position', String(payload.position))
  if (payload.dropKey) form.append('drop_key', payload.dropKey)
  if (payload.note.trim()) form.append('note', payload.note.trim())
  form.append('screenshot', payload.screenshot)
  // The client defaults to JSON; multipart lets the browser set the boundary.
  return (
    await apiClient.post<Submission>(`/events/${eventId}/submissions`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data
}

export function screenshotUrl(submissionId: string): string {
  return `${apiClient.defaults.baseURL}/submissions/${submissionId}/screenshot`
}

export async function fetchReviewQueue(
  eventId: string,
  kind: SubmissionKind | null,
  limit: number,
): Promise<ReviewQueue> {
  return (
    await apiClient.get<ReviewQueue>(`/admin/events/${eventId}/submissions`, {
      params: { status: 'pending', kind: kind ?? undefined, limit },
    })
  ).data
}

export async function acceptSubmission(submissionId: string): Promise<Submission> {
  return (await apiClient.post<Submission>(`/admin/submissions/${submissionId}/accept`)).data
}

export async function rejectSubmission({
  submissionId,
  payload,
}: {
  submissionId: string
  payload: RejectPayload
}): Promise<Submission> {
  return (await apiClient.post<Submission>(`/admin/submissions/${submissionId}/reject`, payload))
    .data
}
