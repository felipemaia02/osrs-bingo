import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import { useState } from 'react'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { screenshotUrl } from '../api/submissionsApi'
import type { Submission, SubmissionStatus } from '../types'

const STATUS_TONE: Record<SubmissionStatus, BadgeTone> = {
  pending: 'gold',
  accepted: 'success',
  rejected: 'danger',
}
const STATUS_ICON = {
  pending: ScheduleOutlinedIcon,
  accepted: CheckOutlinedIcon,
  rejected: CloseOutlinedIcon,
} as const

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useTranslation()
  const Icon = STATUS_ICON[status]
  return (
    <Badge tone={STATUS_TONE[status]}>
      <Icon sx={{ fontSize: 13 }} aria-hidden="true" />
      {t(`submissions.status.${status}`)}
    </Badge>
  )
}

/** Marks drops that came from DropTracker instead of a manual screenshot (feature 030). */
export function SourceBadge({ submission }: { submission: Submission }) {
  const { t } = useTranslation()
  if (submission.source !== 'droptracker') return null
  return (
    <Badge tone="info">
      <SyncOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
      {t('submissions.source.droptracker')}
    </Badge>
  )
}

/** The screenshot from the API (owner or administrator only); opens the original on click. */
export function Screenshot({
  submission,
  className,
  compact = false,
}: {
  submission: Submission
  className: string
  /** Small thumbnails (tile history): icon only, the text goes to the tooltip. */
  compact?: boolean
}) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const url = screenshotUrl(submission.id)
  if (submission.has_screenshot === false)
    return (
      <span
        title={compact ? t('submissions.noDropTrackerImage') : undefined}
        className={`flex flex-col items-center justify-center gap-1 rounded-[3px] border border-rs-border bg-rs-inset text-xs text-rs-muted ${className}`}
      >
        <ImageOutlinedIcon aria-hidden="true" />
        {compact ? (
          <span className="sr-only">{t('submissions.noDropTrackerImage')}</span>
        ) : (
          t('submissions.noDropTrackerImage')
        )}
      </span>
    )
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={t('submissions.openScreenshot')}
      className={`flex items-center justify-center overflow-hidden rounded-[3px] border border-rs-border bg-rs-inset ${className}`}
    >
      {failed ? (
        <span
          title={compact ? t('submissions.screenshotUnavailable') : undefined}
          className="flex flex-col items-center gap-1 text-xs text-rs-muted"
        >
          <ImageOutlinedIcon aria-hidden="true" />
          {compact ? (
            <span className="sr-only">{t('submissions.screenshotUnavailable')}</span>
          ) : (
            t('submissions.screenshotUnavailable')
          )}
        </span>
      ) : (
        <img
          src={url}
          alt={t('submissions.screenshotAlt')}
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain"
        />
      )}
    </a>
  )
}
