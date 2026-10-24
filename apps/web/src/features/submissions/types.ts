export type SubmissionKind = 'drop' | 'preverification'
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected'
export type RejectionReason =
  'unreadable_screenshot' | 'item_mismatch' | 'outside_event_period' | 'other'

export const REJECTION_REASONS: RejectionReason[] = [
  'unreadable_screenshot',
  'item_mismatch',
  'outside_event_period',
  'other',
]

export interface Submission {
  id: string
  event_id: string
  kind: SubmissionKind
  status: SubmissionStatus
  position: number
  row: number
  column: number
  card_id: string
  card_revision: number
  card_name: string
  drop_key: string | null
  drop_name: string | null
  progress_weight: number | null
  quantity: number
  note: string | null
  /** The card's pre-verification instructions (pre-verification submissions). */
  preverification_note?: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewer_name: string | null
  rejection_reason: RejectionReason | null
  rejection_note: string | null
}

export interface SubmissionCounts {
  all: number
  pending: number
  accepted: number
  rejected: number
}

export interface OwnSubmissions {
  items: Submission[]
  counts: SubmissionCounts
}

export interface ReviewItem extends Submission {
  player_id: string
  player_name: string
  team_id: string
  team_name: string | null
  team_color: string | null
  requires_preverification: boolean
  preverification_status: SubmissionStatus | null
  within_event: boolean
  /** The reviewing admin plays on this team: another admin reviews it (feature 026). */
  own_team?: boolean
}

export interface ReviewQueue {
  items: ReviewItem[]
  total: number
  offset: number
  limit: number
  counts: { pending: number; pending_preverification: number; pending_drop: number }
}

export interface SubmitPayload {
  kind: SubmissionKind
  position: number
  dropKey: string | null
  note: string
  screenshot: File
}

export interface RejectPayload {
  reason: RejectionReason
  note: string | null
}
