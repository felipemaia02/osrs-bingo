import { useTranslation } from 'react-i18next'
import { useSubmissionTime } from '../hooks/useSubmissionTime'
import { useSubmissionTitle } from '../hooks/useSubmissionTitle'
import type { Submission } from '../types'
import { SourceBadge, SubmissionStatusBadge } from './SubmissionParts'
import { screenshotUrl } from '../api/submissionsApi'

/** One of the player's own submissions (future-my-submissions card). */
export function SubmissionCard({ submission }: { submission: Submission }) {
  const { t } = useTranslation()
  const title = useSubmissionTitle()
  const { when } = useSubmissionTime()
  const isPreverification = submission.kind === 'preverification'
  const meta = [
    t(isPreverification ? 'submissions.kind.preverification' : 'submissions.kind.drop'),
    when(submission.submitted_at),
    submission.reviewer_name
      ? t('submissions.reviewedBy', { name: submission.reviewer_name })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const progress = submission.progress_weight
    ? t(
        submission.status === 'accepted'
          ? 'submissions.progressAdded'
          : 'submissions.progressOnAccept',
        { count: submission.progress_weight, card: submission.card_name },
      )
    : null

  return (
    <article
      className={`flex flex-col gap-1.5 rounded border bg-rs-surface p-3 ${
        submission.status === 'rejected' ? 'border-rs-danger' : 'border-rs-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="min-w-0 break-words">{title(submission)}</strong>
        <span className="flex shrink-0 flex-wrap justify-end gap-1">
          <SourceBadge submission={submission} />
          <SubmissionStatusBadge status={submission.status} />
        </span>
      </div>
      <span className="text-xs text-rs-muted">{meta}</span>
      {isPreverification && submission.status === 'pending' && (
        <span className="text-xs">{t('submissions.preverificationPendingHint')}</span>
      )}
      {progress && submission.status !== 'rejected' && <span className="text-xs">{progress}</span>}
      {submission.status === 'rejected' && (
        <span className="rounded-[3px] bg-rs-danger-bg px-2.5 py-2 text-[13px]">
          <strong>{t('submissions.reason')}</strong>{' '}
          {t(`submissions.reasons.${submission.rejection_reason ?? 'other'}`)}
          {submission.rejection_note ? ` — ${submission.rejection_note}` : ''}
        </span>
      )}
      {submission.note && <span className="text-xs text-rs-muted">“{submission.note}”</span>}
      {submission.has_screenshot !== false && (
        <a
          href={screenshotUrl(submission.id)}
          target="_blank"
          rel="noreferrer"
          className="self-start text-xs text-rs-gold-bright hover:text-rs-gold-hover"
        >
          {t('submissions.viewScreenshot')}
        </a>
      )}
    </article>
  )
}
