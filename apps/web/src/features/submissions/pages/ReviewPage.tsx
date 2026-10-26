import { useEffect, useRef, useState } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useEvents } from '../../events/hooks/useEvents'
import { ReviewDetail } from '../components/ReviewDetail'
import { ReviewList } from '../components/ReviewList'
import { submissionErrorKey } from '../errors'
import { useReviewActions, useReviewQueue } from '../hooks/useSubmissions'
import type { RejectPayload, ReviewStatus, SubmissionKind } from '../types'

type KindFilter = SubmissionKind | 'all'
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const SEARCH_DELAY_MS = 300

/** Administrator review queue (future-review): every pending submission, oldest first. */
export function ReviewPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents()
  const reviewable = (events.data ?? []).filter((event) => event.status !== 'draft')
  const [chosenEventId, setChosenEventId] = useState<string | null>(null)
  const eventId =
    chosenEventId ??
    reviewable.find((event) => event.status === 'active')?.id ??
    reviewable[0]?.id ??
    null
  const [kind, setKind] = useState<KindFilter>('all')
  // Feature 035: accepted submissions are browsed (latest first) to revert mistakes.
  const [status, setStatus] = useState<ReviewStatus>('pending')
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search, SEARCH_DELAY_MS)
  const queue = useReviewQueue(eventId, kind === 'all' ? null : kind, status, term)
  const pendingCounts = useReviewQueue(eventId, null).data?.counts
  const actions = useReviewActions()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const reasonRef = useRef<HTMLSelectElement>(null)
  const lastIndex = useRef(0)

  const items = queue.data?.items ?? []
  const foundIndex = items.findIndex((item) => item.id === selectedId)
  // After a decision the item leaves the queue: keep the same place in the list.
  const index =
    foundIndex >= 0 ? foundIndex : Math.min(lastIndex.current, Math.max(items.length - 1, 0))
  const selected = items[index] ?? null
  lastIndex.current = index
  const busy = actions.accept.isPending || actions.reject.isPending || actions.revert.isPending
  const reverting = status === 'accepted'
  const showList = isDesktop || selectedId === null

  function select(position: number) {
    const next = items[position]
    if (!next) return
    setSelectedId(next.id)
    setError(null)
  }

  async function decide(run: () => Promise<unknown>, messageKey: string) {
    setError(null)
    setFeedback(null)
    try {
      await run()
      setFeedback(t(messageKey))
      setSelectedId(null)
    } catch (failure) {
      setError(t(submissionErrorKey(failure)))
    }
  }

  const accept = () =>
    selected &&
    void decide(() => actions.accept.mutateAsync(selected.id), 'review.feedback.accepted')
  const reject = (payload: RejectPayload) =>
    selected &&
    void decide(
      () => actions.reject.mutateAsync({ submissionId: selected.id, payload }),
      'review.feedback.rejected',
    )

  const revert = (payload: RejectPayload) =>
    selected &&
    void decide(
      () => actions.revert.mutateAsync({ submissionId: selected.id, payload }),
      'review.feedback.reverted',
    )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)) return
      const key = event.key.toLowerCase()
      if (key === 'j') select(index + 1)
      else if (key === 'k') select(index - 1)
      else if (key === 'a' && selected && !busy && !selected.own_team && !reverting) {
        const waiting =
          selected.kind === 'drop' &&
          selected.requires_preverification &&
          selected.preverification_status !== 'accepted'
        if (!waiting) accept()
      } else if (key === 'r') {
        event.preventDefault()
        reasonRef.current?.focus()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const counts = pendingCounts ?? queue.data?.counts
  return (
    <AppShell desktopPadding="md:px-7 md:pt-[22px]">
      <div className="flex flex-col gap-3 md:gap-3.5">
        {!isDesktop && (
          <Link
            to="/admin"
            className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
          >
            <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
            {t('admin.title')}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            {isDesktop && (
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
                {t('admin.title')}
              </span>
            )}
            <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
              {t('review.title')}
            </h1>
            <span className="text-rs-muted">{t('review.description')}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            {reviewable.length > 1 && (
              <label className="relative flex w-full items-center md:w-[300px]">
                <span className="sr-only">{t('review.event')}</span>
                <select
                  value={eventId ?? ''}
                  onChange={(change) => {
                    setChosenEventId(change.target.value)
                    setSelectedId(null)
                  }}
                  className="min-h-11 w-full appearance-none rounded-[3px] border border-rs-border bg-rs-inset pl-3 pr-9 text-base text-rs-text md:min-h-10 md:text-sm"
                >
                  {reviewable.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} · {t(`events.status.${event.status}`)}
                    </option>
                  ))}
                </select>
                <ExpandMoreOutlinedIcon
                  className="pointer-events-none absolute right-2.5"
                  aria-hidden="true"
                />
              </label>
            )}
            {isDesktop && (
              <span className="flex gap-2.5 text-xs text-rs-muted">{t('review.shortcuts')}</span>
            )}
          </div>
        </div>
        {feedback && (
          <p role="status" className="m-0 text-sm">
            {feedback}
          </p>
        )}
        {events.isLoading || (eventId && queue.isLoading) ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError || queue.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : !eventId ? (
          <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
            {t('review.noEvent')}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<ReviewStatus>
                label={t('review.statusFilter')}
                variant="chip"
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setSelectedId(null)
                  setSearch('')
                }}
                options={[
                  {
                    value: 'pending',
                    label: `${t('review.statuses.pending')} ${counts?.pending ?? 0}`,
                  },
                  { value: 'accepted', label: t('review.statuses.accepted') },
                ]}
              />
              <SegmentedControl<KindFilter>
                label={t('review.filter')}
                variant="chip"
                value={kind}
                onChange={(value) => {
                  setKind(value)
                  setSelectedId(null)
                }}
                options={
                  reverting
                    ? [
                        { value: 'all', label: t('review.filters.all') },
                        { value: 'preverification', label: t('review.filters.preverification') },
                        { value: 'drop', label: t('review.filters.drop') },
                      ]
                    : [
                        {
                          value: 'all',
                          label: `${t('review.filters.all')} ${counts?.pending ?? 0}`,
                        },
                        {
                          value: 'preverification',
                          label: `${t('review.filters.preverification')} ${counts?.pending_preverification ?? 0}`,
                        },
                        {
                          value: 'drop',
                          label: `${t('review.filters.drop')} ${counts?.pending_drop ?? 0}`,
                        },
                      ]
                }
              />
              {reverting && (
                <input
                  type="search"
                  value={search}
                  onChange={(change) => {
                    setSearch(change.target.value)
                    setSelectedId(null)
                  }}
                  aria-label={t('review.search')}
                  placeholder={t('review.search')}
                  className="min-h-10 min-w-0 flex-1 rounded-[3px] border border-rs-border bg-rs-inset px-3 text-sm text-rs-text outline-none placeholder:text-rs-muted focus:border-rs-gold md:max-w-xs"
                />
              )}
              <span className="ml-auto text-[13px] text-rs-muted">
                {t(reverting ? 'review.latestFirst' : 'review.oldestFirst')}
              </span>
            </div>
            {!items.length ? (
              <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                {t(reverting ? 'review.emptyAccepted' : 'review.empty')}
              </p>
            ) : (
              <div className="flex flex-col items-start gap-4 md:flex-row">
                {showList && (
                  <section className="w-full shrink-0 overflow-hidden rounded border border-rs-border bg-rs-surface md:w-[470px]">
                    <ReviewList
                      items={items}
                      selectedId={isDesktop ? (selected?.id ?? null) : null}
                      onSelect={(item) => {
                        setSelectedId(item.id)
                        setError(null)
                      }}
                    />
                  </section>
                )}
                {selected && (isDesktop || selectedId !== null) && (
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
                    {!isDesktop && (
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="inline-flex min-h-11 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
                      >
                        <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
                        {t('review.backToQueue')}
                      </button>
                    )}
                    <ReviewDetail
                      key={selected.id}
                      item={selected}
                      index={index}
                      total={items.length}
                      busy={busy}
                      error={error}
                      reasonRef={reasonRef}
                      onPrevious={() => select(index - 1)}
                      onNext={() => select(index + 1)}
                      onAccept={accept}
                      onReject={reject}
                      mode={status}
                      onRevert={revert}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
