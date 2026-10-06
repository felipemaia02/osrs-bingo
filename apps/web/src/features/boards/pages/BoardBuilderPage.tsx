import { useEffect, useMemo, useState } from 'react'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { useCards } from '../../cards/hooks/useCards'
import { useEvents } from '../../events/hooks/useEvents'
import { useAdminBoard, useSaveBoard } from '../hooks/useBoards'

const POSITIONS = Array.from({ length: 36 }, (_, index) => index + 1)

export function BoardBuilderPage() {
  const { t } = useTranslation()
  const events = useEvents()
  const cards = useCards()
  const [eventId, setEventId] = useState<string | null>(null)
  const board = useAdminBoard(eventId)
  const save = useSaveBoard()
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const selectedEvent = events.data?.find((event) => event.id === eventId) ?? null

  useEffect(() => {
    if (!board.isFetched) return
    setAssignments(
      Object.fromEntries(
        (board.data?.positions ?? []).map((position) => [
          position.position,
          `${position.card.card_id}:${position.card.card_revision}`,
        ]),
      ),
    )
  }, [board.data, board.isFetched])

  const cardOptions = useMemo(
    () =>
      (cards.data ?? []).map((card) => ({
        key: `${card.id}:${card.current_revision}`,
        card,
      })),
    [cards.data],
  )
  const selectedKeys = new Set(Object.values(assignments).filter(Boolean))
  const filled = selectedKeys.size

  async function submit() {
    if (!eventId) return
    setFeedback(null)
    try {
      await save.mutateAsync({
        eventId,
        payload: {
          expected_revision: board.data?.revision ?? 0,
          positions: Object.entries(assignments)
            .filter(([, value]) => Boolean(value))
            .map(([position, value]) => {
              const [cardId, revision] = value.split(':')
              return {
                position: Number(position),
                card_id: cardId,
                card_revision: Number(revision),
              }
            }),
        },
      })
      setFeedback(t('boards.feedback.saved'))
    } catch (error) {
      const detail = error instanceof AxiosError ? error.response?.data?.detail : null
      setFeedback(
        detail === 'Board changed while you were editing'
          ? t('boards.errors.changed')
          : detail === 'Retired cards cannot be selected'
            ? t('boards.errors.retired')
            : t('common.apiError'),
      )
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[96rem] space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-rs-text">{t('boards.title')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-rs-muted">{t('boards.description')}</p>
        </div>
        <Panel className="p-4">
          <label className="text-sm text-rs-muted">
            {t('boards.event')}
            <select
              value={eventId ?? ''}
              onChange={(event) => {
                setEventId(event.target.value || null)
                setAssignments({})
                setFeedback(null)
              }}
              className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text sm:max-w-lg"
            >
              <option value="">{t('boards.selectEvent')}</option>
              {events.data?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {t(`events.status.${event.status}`)}
                </option>
              ))}
            </select>
          </label>
        </Panel>
        {feedback && (
          <p role="status" className="rounded-sm border border-rs-border bg-rs-inset p-3 text-sm">
            {feedback}
          </p>
        )}
        {eventId && (board.isLoading || cards.isLoading) && (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        )}
        {eventId && board.isError && (
          <p role="alert" className="text-rs-muted">
            {t('common.apiError')}
          </p>
        )}
        {eventId && !board.isLoading && !cards.isLoading && (
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rs-border/50 p-4">
              <div className="flex items-center gap-2">
                <GridViewOutlinedIcon className="text-rs-gold" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-lg text-rs-gold-bright">
                    {selectedEvent?.name}
                  </h2>
                  <p className="text-xs text-rs-muted">
                    {t('boards.filled', { filled, total: 36 })}
                  </p>
                </div>
              </div>
              {selectedEvent?.status === 'draft' ? (
                <button
                  onClick={() => void submit()}
                  disabled={save.isPending}
                  className="rounded-sm bg-rs-gold px-4 py-2 text-sm font-semibold text-rs-inset disabled:opacity-50"
                >
                  {t(save.isPending ? 'common.saving' : 'boards.save')}
                </button>
              ) : (
                <span className="text-sm text-rs-muted">{t('boards.readOnly')}</span>
              )}
            </div>
            {!cardOptions.length && (
              <p className="p-5 text-sm text-rs-muted">{t('boards.noCards')}</p>
            )}
            <div className="overflow-x-auto p-4" tabIndex={0} aria-label={t('boards.gridLabel')}>
              <div className="grid min-w-[62rem] grid-cols-6 gap-2 lg:min-w-0">
                {POSITIONS.map((position) => {
                  const selected = assignments[position] ?? ''
                  const current = cardOptions.find((item) => item.key === selected)?.card
                  return (
                    <label
                      key={position}
                      className="flex min-h-40 flex-col rounded-sm border border-rs-border/60 bg-rs-raised p-2 text-xs text-rs-muted"
                    >
                      <span>{t('boards.position', { position })}</span>
                      {current?.revision.wiki_image ? (
                        <img
                          src={current.revision.wiki_image.image_url}
                          alt=""
                          className="mx-auto mt-2 h-16 max-w-full object-contain"
                        />
                      ) : (
                        <div className="mt-2 h-16 rounded-sm bg-rs-inset" />
                      )}
                      <select
                        aria-label={t('boards.position', { position })}
                        value={selected}
                        disabled={selectedEvent?.status !== 'draft'}
                        onChange={(event) =>
                          setAssignments((currentAssignments) => ({
                            ...currentAssignments,
                            [position]: event.target.value,
                          }))
                        }
                        className="mt-auto w-full rounded-sm border border-rs-border bg-rs-inset p-1.5 text-xs text-rs-text"
                      >
                        <option value="">{t('boards.emptyPosition')}</option>
                        {cardOptions.map((option) => (
                          <option
                            key={option.key}
                            value={option.key}
                            disabled={selectedKeys.has(option.key) && option.key !== selected}
                          >
                            {option.card.revision.name} · {option.card.revision.tile_score} pts
                          </option>
                        ))}
                      </select>
                      {current && (
                        <span className="mt-2 text-[11px] text-rs-muted">
                          {t(`tile.tier.${current.revision.difficulty}`)} · v
                          {current.current_revision}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  )
}
