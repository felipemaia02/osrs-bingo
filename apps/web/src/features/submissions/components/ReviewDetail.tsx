import { useState, type RefObject } from 'react'
import CheckCircle from '@mui/icons-material/CheckCircle'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { useSubmissionTime } from '../hooks/useSubmissionTime'
import {
  REJECTION_REASONS,
  type RejectPayload,
  type RejectionReason,
  type ReviewItem,
  type ReviewStatus,
} from '../types'
import { Screenshot, SourceBadge, SubmissionStatusBadge } from './SubmissionParts'
import { TileHistoryPanel } from './TileHistoryPanel'

interface ReviewDetailProps {
  item: ReviewItem
  index: number
  total: number
  busy: boolean
  error: string | null
  reasonRef: RefObject<HTMLSelectElement>
  onPrevious: () => void
  onNext: () => void
  onAccept: () => void
  onReject: (payload: RejectPayload) => void
  /** "accepted": the submission was accepted and can only be reverted (feature 035). */
  mode?: ReviewStatus
  onRevert?: (payload: RejectPayload) => void
}

/** The selected submission with its screenshot, rules and decision (future-review detail). */
export function ReviewDetail({
  item,
  index,
  total,
  busy,
  error,
  reasonRef,
  onPrevious,
  onNext,
  onAccept,
  onReject,
  mode = 'pending',
  onRevert,
}: ReviewDetailProps) {
  const { t } = useTranslation()
  const { when } = useSubmissionTime()
  const [reason, setReason] = useState<RejectionReason | ''>('')
  const [note, setNote] = useState('')
  const preverification = item.kind === 'preverification'
  const waiting =
    !preverification && item.requires_preverification && item.preverification_status !== 'accepted'
  const removed = Boolean(item.drop_removed)
  const rejectReady = reason !== '' && (reason !== 'other' || note.trim() !== '')
  const reverting = mode === 'accepted'
  const duplicates = item.possible_duplicates?.length ?? 0
  const payload = (): RejectPayload | null =>
    reason ? { reason, note: reason === 'other' ? note.trim() : null } : null
  const label = 'text-rs-muted'

  return (
    <section
      aria-label={t('review.selected')}
      className="flex min-w-0 flex-1 flex-col rounded border border-rs-border bg-rs-surface"
    >
      <div className="flex items-center justify-between gap-3 border-b border-rs-border px-4 py-3">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold">
              {t('review.position', { index: index + 1, total })}
              {preverification ? ` · ${t('submissions.kind.preverification')}` : ''}
            </span>
            <SourceBadge submission={item} />
          </span>
          <h2 className="m-0 mt-0.5 truncate font-display text-[21px] text-rs-gold-bright">
            {preverification ? t('review.initialScreenshot') : item.drop_name} — {item.player_name}
          </h2>
        </div>
        <span className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            onClick={onPrevious}
            disabled={index === 0}
            aria-label={t('review.previous')}
          >
            <KeyboardArrowUpOutlinedIcon aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            onClick={onNext}
            disabled={index >= total - 1}
            aria-label={t('review.next')}
          >
            <KeyboardArrowDownOutlinedIcon aria-hidden="true" />
          </Button>
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 lg:flex-row">
        <figure className="m-0 flex w-full shrink-0 flex-col gap-1.5 lg:w-[300px] 2xl:w-[380px]">
          <Screenshot submission={item} className="h-60 w-full" />
          <figcaption className="text-xs text-rs-muted">{t('review.openOriginal')}</figcaption>
        </figure>
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className={label}>{t('review.player')}</dt>
            <dd className="m-0 flex flex-wrap items-center gap-1.5">
              <TeamEmblem
                team={{ name: item.team_name ?? '?', color: item.team_color }}
                size="sm"
              />
              {item.player_name}
              {item.team_name && <span className={label}>· {item.team_name}</span>}
            </dd>
            <dt className={label}>{t('review.card')}</dt>
            <dd className="m-0">
              {item.card_name}{' '}
              <span className={label}>
                · {t('submissions.form.positionLabel', { row: item.row, column: item.column })}
              </span>
            </dd>
            {!preverification && (
              <>
                <dt className={label}>{t('review.item')}</dt>
                <dd className="m-0">
                  {item.drop_name}{' '}
                  <span className="font-semibold text-rs-gold-bright">
                    {t('cards.rules.progress', { count: item.progress_weight ?? 0 })}
                  </span>
                </dd>
              </>
            )}
            <dt className={label}>{t('review.sent')}</dt>
            <dd className="m-0">{when(item.submitted_at)}</dd>
            <dt className={label}>{t('review.period')}</dt>
            <dd className="m-0 flex items-center gap-1.5">
              {item.within_event ? (
                <CheckCircle
                  sx={{ fontSize: 16 }}
                  className="text-rs-success-text"
                  aria-hidden="true"
                />
              ) : (
                <ErrorOutlineOutlinedIcon
                  sx={{ fontSize: 16 }}
                  className="text-rs-danger-text"
                  aria-hidden="true"
                />
              )}
              {t(item.within_event ? 'review.withinEvent' : 'review.outsideEvent')}
            </dd>
            {item.requires_preverification && !preverification && (
              <>
                <dt className={label}>{t('review.preverification')}</dt>
                <dd className="m-0 flex items-center gap-1.5">
                  {item.preverification_status ? (
                    <SubmissionStatusBadge status={item.preverification_status} />
                  ) : (
                    t('review.preverificationMissing')
                  )}
                </dd>
              </>
            )}
            {preverification && item.preverification_note && (
              <>
                <dt className={label}>{t('review.instructions')}</dt>
                <dd className="m-0 whitespace-pre-line">{item.preverification_note}</dd>
              </>
            )}
            {item.note && (
              <>
                <dt className={label}>{t('review.note')}</dt>
                <dd className="m-0">“{item.note}”</dd>
              </>
            )}
          </dl>
          {duplicates > 0 && (
            <p
              role="note"
              className="m-0 flex items-start gap-2 rounded-[3px] border border-rs-danger/70 bg-rs-danger-bg px-3 py-2 text-[13px]"
            >
              <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              <span>
                <strong>{t('review.duplicate.badge')}</strong> · {t('review.duplicate.hint')}
              </span>
            </p>
          )}
          {reverting && (
            <p className="m-0 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-3 py-2 text-[13px]">
              {t('review.revert.hint', { name: item.reviewer_name ?? '—' })}
            </p>
          )}
          {removed && (
            <p className="m-0 rounded-[3px] border border-rs-danger/70 bg-rs-danger-bg px-3 py-2 text-[13px]">
              {t('review.dropRemoved')}
            </p>
          )}
          {waiting && !reverting && (
            <p className="m-0 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-3 py-2 text-[13px]">
              {t('review.waitingPreverification')}
            </p>
          )}
          {item.own_team ? (
            <p className="m-0 rounded-[3px] border border-rs-info bg-rs-info-bg px-3 py-2 text-[13px] text-rs-info-banner-text">
              {t('review.ownTeam')}
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold">
                  {t(reverting ? 'review.revert.reasonLabel' : 'review.reasonLabel')}{' '}
                  {!reverting && (
                    <span className="font-normal text-rs-muted">{t('review.reasonHint')}</span>
                  )}
                </span>
                <select
                  ref={reasonRef}
                  value={reason}
                  onChange={(change) => setReason(change.target.value as RejectionReason | '')}
                  className={FIELD_CLASS}
                >
                  <option value="">{t('review.chooseReason')}</option>
                  {REJECTION_REASONS.map((value) => (
                    <option key={value} value={value}>
                      {t(`submissions.reasons.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              {reason === 'other' && (
                <label className="flex flex-col gap-1 text-[13px] font-semibold">
                  {t('review.otherNote')}
                  <input
                    value={note}
                    maxLength={280}
                    onChange={(change) => setNote(change.target.value)}
                    className={`${FIELD_CLASS} font-normal`}
                  />
                </label>
              )}
              {error && (
                <p
                  role="alert"
                  className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
                >
                  {error}
                </p>
              )}
            </>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {!item.own_team && reverting && (
              <Button
                variant="danger"
                disabled={busy || !rejectReady}
                onClick={() => {
                  const chosen = payload()
                  if (chosen) onRevert?.(chosen)
                }}
              >
                <UndoOutlinedIcon fontSize="small" aria-hidden="true" />
                {t('review.revert.action')}
              </Button>
            )}
            {!item.own_team && !reverting && (
              <>
                <Button variant="success" onClick={onAccept} disabled={busy || waiting || removed}>
                  <CheckOutlinedIcon fontSize="small" aria-hidden="true" />
                  {t('review.accept')}
                  <kbd className="hidden rounded-[3px] border border-rs-canvas px-1.5 text-[11px] md:inline">
                    A
                  </kbd>
                </Button>
                <Button
                  variant="danger"
                  disabled={busy || !rejectReady}
                  onClick={() =>
                    reason && onReject({ reason, note: reason === 'other' ? note.trim() : null })
                  }
                >
                  <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
                  {t('review.reject')}
                  <kbd className="hidden rounded-[3px] border border-rs-border px-1.5 text-[11px] md:inline">
                    R
                  </kbd>
                </Button>
              </>
            )}
            <Button className="ml-auto" onClick={onNext} disabled={index >= total - 1}>
              {t('review.skip')}
            </Button>
          </div>
        </div>
      </div>
      <TileHistoryPanel item={item} />
    </section>
  )
}
