import { useState } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { useSubmissionTime } from '../hooks/useSubmissionTime'
import { useSubmissionTitle } from '../hooks/useSubmissionTitle'
import type { Submission } from '../types'
import { SourceBadge, SubmissionStatusBadge } from './SubmissionParts'
import { screenshotUrl } from '../api/submissionsApi'
import { AttachScreenshotModal } from './AttachScreenshotModal'
import { ScreenshotViewer } from './ScreenshotViewer'

/** A pending DropTracker drop that came without a screenshot: the player can send one (057). */
function missesScreenshot(submission: Submission): boolean {
  return (
    submission.source === 'droptracker' &&
    submission.status === 'pending' &&
    submission.has_screenshot === false
  )
}

interface SubmissionCardProps {
  submission: Submission
  onScreenshotSent?: () => void
}

/** One of the player's own submissions (future-my-submissions card). */
export function SubmissionCard({ submission, onScreenshotSent }: SubmissionCardProps) {
  const { t } = useTranslation()
  const title = useSubmissionTitle()
  const { when } = useSubmissionTime()
  const [viewing, setViewing] = useState(false)
  const [attaching, setAttaching] = useState(false)
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
          {submission.reverted_at && (
            <span className="mb-0.5 block text-xs">{t('submissions.reverted')}</span>
          )}
          <strong>{t('submissions.reason')}</strong>{' '}
          {t(`submissions.reasons.${submission.rejection_reason ?? 'other'}`)}
          {submission.rejection_note ? ` — ${submission.rejection_note}` : ''}
        </span>
      )}
      {submission.note && <span className="text-xs text-rs-muted">“{submission.note}”</span>}
      {missesScreenshot(submission) && (
        <div className="flex flex-col gap-2 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-3 py-2 text-[13px] sm:flex-row sm:items-center">
          <span className="flex flex-1 gap-2">
            <WarningAmberOutlinedIcon
              fontSize="small"
              className="shrink-0 text-rs-gold-bright"
              aria-hidden="true"
            />
            {t('submissions.missingScreenshot.warning')}
          </span>
          <Button size="sm" className="shrink-0 self-start" onClick={() => setAttaching(true)}>
            <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('submissions.missingScreenshot.send')}
          </Button>
        </div>
      )}
      {submission.has_screenshot !== false && (
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="self-start text-xs text-rs-gold-bright hover:text-rs-gold-hover"
        >
          {t('submissions.viewScreenshot')}
        </button>
      )}
      {attaching && (
        <AttachScreenshotModal
          submission={submission}
          onSent={() => {
            setAttaching(false)
            onScreenshotSent?.()
          }}
          onClose={() => setAttaching(false)}
        />
      )}
      {viewing && (
        <ScreenshotViewer
          url={screenshotUrl(submission.id)}
          title={title(submission)}
          onClose={() => setViewing(false)}
        />
      )}
    </article>
  )
}
