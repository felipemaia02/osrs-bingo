import { AxiosError } from 'axios'

const ERROR_KEYS: Record<string, string> = {
  'Submissions are only open while the event is active': 'submissions.errors.notActive',
  'Only approved players with a team can submit': 'submissions.errors.notEligible',
  'Board position not found': 'submissions.errors.position',
  'This item is not accepted by this card': 'submissions.errors.drop',
  'Choose the item you got': 'submissions.errors.dropRequired',
  "Send this card's pre-verification first": 'submissions.errors.preverificationRequired',
  "This card doesn't require pre-verification": 'submissions.errors.preverificationNotNeeded',
  'A pre-verification for this card is already pending or accepted':
    'submissions.errors.preverificationExists',
  "Accept this player's pre-verification for the card first":
    'submissions.errors.preverificationNotAccepted',
  'Submission already reviewed': 'submissions.errors.alreadyReviewed',
  'You play on this team — another admin reviews it': 'review.ownTeam',
  'Submissions can only be reviewed for active or finished events':
    'submissions.errors.reviewClosed',
  'Screenshot must be a PNG, JPEG or WebP image': 'submissions.errors.imageType',
  'Screenshot is too large': 'submissions.errors.imageSize',
  'Request body too large': 'submissions.errors.imageSize',
  'Screenshot storage is unavailable': 'submissions.errors.storage',
}

export function submissionErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  return (typeof detail === 'string' && ERROR_KEYS[detail]) || 'common.apiError'
}
