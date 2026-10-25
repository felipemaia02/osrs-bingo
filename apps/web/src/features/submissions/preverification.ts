import type { Submission, SubmissionStatus } from './types'

const RANK: Record<SubmissionStatus, number> = { rejected: 1, pending: 2, accepted: 3 }

/** Best pre-verification state per board position: accepted > pending > rejected. */
export function preverificationStates(items: Submission[]): Map<number, SubmissionStatus> {
  const states = new Map<number, SubmissionStatus>()
  for (const item of items) {
    if (item.kind !== 'preverification') continue
    const current = states.get(item.position)
    if (!current || RANK[item.status] > RANK[current]) states.set(item.position, item.status)
  }
  return states
}

/** A drop of this card can be sent once its pre-verification is pending or accepted. */
export function canSendDrops(requires: boolean, state: SubmissionStatus | undefined): boolean {
  return !requires || state === 'pending' || state === 'accepted'
}
