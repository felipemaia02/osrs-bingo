import { useEffect, useMemo, useRef, useState } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { Link } from 'react-router-dom'
import { BoardCardPreview } from '../components/BoardCardPreview'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { CardRuleDetails } from '../../cards/components/CardRuleDetails'
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
  const [selectedPosition, setSelectedPosition] = useState(1)
  const dragging = useRef<{ key: string; position?: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')
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
  const filled = Object.values(assignments).filter(Boolean).length
  const editable =
    selectedEvent?.status === 'draft' && !board.isLoading && !board.isError && !save.isPending
  const visibleCards = cardOptions.filter(
    ({ card }) =>
      card.status === 'active' &&
      card.revision.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const snapshots = new Map(
    (board.data?.positions ?? []).map(({ card }) => [
      `${card.card_id}:${card.card_revision}`,
      card,
    ]),
  )
  const cardFor = (key: string) =>
    snapshots.get(key) ?? cardOptions.find((option) => option.key === key)?.card.revision
  const selectedCard = assignments[selectedPosition]
    ? cardFor(assignments[selectedPosition])
    : undefined
  const availableCards = cardOptions.filter(
    ({ card }) =>
      card.status === 'active' &&
      !Object.values(assignments).some((value) => value.split(':')[0] === card.id),
  )
  const canAddAll =
    editable &&
    !cards.isLoading &&
    !cards.isError &&
    filled < POSITIONS.length &&
    availableCards.length > 0
  function addAll() {
    if (!canAddAll) return
    setAssignments((current) => {
      const next = { ...current }
      const used = new Set(
        Object.values(current)
          .filter(Boolean)
          .map((value) => value.split(':')[0]),
      )
      const free = POSITIONS.filter((position) => !current[position])
      for (const { key, card } of availableCards) {
        if (!free.length) break
        if (used.has(card.id)) continue
        next[free.shift()!] = key
        used.add(card.id)
      }
      return next
    })
    setFeedback(null)
  }
  function assign(key: string) {
    if (!editable) return
    if (!key) {
      setAssignments((current) => ({ ...current, [selectedPosition]: '' }))
    } else {
      const position = POSITIONS.find((value) => !assignments[value])
      if (
        !position ||
        Object.values(assignments).some((value) => value.split(':')[0] === key.split(':')[0])
      )
        return
      setAssignments((current) => ({ ...current, [position]: key }))
      setSelectedPosition(position)
    }
    setFeedback(null)
  }
  function finishDrop(position?: number) {
    const source = dragging.current
    dragging.current = null
    setDragOver(false)
    if (!editable || !source) return
    if (source.position !== undefined) {
      if (position === undefined) return
      setAssignments((current) => ({
        ...current,
        [source.position!]: current[position] ?? '',
        [position]: current[source.position!] ?? '',
      }))
      setSelectedPosition(position)
      setFeedback(null)
    } else if (
      cardOptions.some((option) => option.key === source.key && option.card.status === 'active')
    ) {
      assign(source.key)
    }
  }
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
                dragging.current = null
                setDragOver(false)
                setEventId(event.target.value || null)
                setAssignments({})
                setSelectedPosition(1)
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
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rs-border/50 p-4">
              <div>
                <h2 className="font-display text-lg text-rs-gold-bright">
                  {selectedEvent?.name ?? t('boards.selectEvent')}
                </h2>
                <p className="mt-1 text-xs text-rs-muted">
                  {t('boards.filled', { filled, total: POSITIONS.length })}
                </p>
              </div>
              {selectedEvent?.status === 'draft' && (
                <button
                  onClick={() => void submit()}
                  disabled={!editable}
                  className="rounded-sm bg-rs-gold px-4 py-2 text-sm font-semibold text-rs-inset disabled:opacity-50"
                >
                  {t(save.isPending ? 'common.saving' : 'boards.save')}
                </button>
              )}
            </div>
            <div className="h-1 bg-rs-inset" aria-hidden="true">
              <div
                className="h-full bg-rs-gold"
                style={{ width: `${(filled / POSITIONS.length) * 100}%` }}
              />
            </div>
            {!eventId ? (
              <p className="p-8 text-sm text-rs-muted">{t('boards.chooseEvent')}</p>
            ) : board.isLoading ? (
              <p role="status" className="p-8">
                {t('common.loading')}
              </p>
            ) : board.isError ? (
              <div role="alert" className="p-8">
                <p>{t('common.apiError')}</p>
                <button onClick={() => void board.refetch()}>{t('auth.retry')}</button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 bg-rs-inset/40 p-4 text-sm">
                  <p className="mr-auto text-rs-muted" role="status">
                    {t(
                      selectedEvent?.status !== 'draft' ? 'boards.readOnly' : 'boards.assignHint',
                      { position: selectedPosition },
                    )}
                  </p>
                  {editable && (
                    <>
                      <button
                        disabled={!assignments[selectedPosition]}
                        onClick={() => assign('')}
                        className="rounded-sm border border-rs-border px-3 py-2 text-rs-text disabled:opacity-40"
                      >
                        {t('boards.remove')}
                      </button>
                    </>
                  )}
                </div>
                <div
                  className="overflow-x-auto p-4"
                  tabIndex={0}
                  aria-label={t('boards.gridLabel')}
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                    {POSITIONS.filter((position) => assignments[position]).map((position) => {
                      const key = assignments[position] ?? ''
                      const card = cardFor(key)
                      return (
                        <button
                          key={position}
                          type="button"
                          aria-label={t('boards.position', { position })}
                          aria-pressed={selectedPosition === position}
                          onClick={() => setSelectedPosition(position)}
                          draggable={editable}
                          onDragStart={(event) => {
                            dragging.current = { key, position }
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', key)
                          }}
                          onDragEnd={() => {
                            dragging.current = null
                            setDragOver(false)
                          }}
                          onDragOver={(event) => {
                            if (editable && dragging.current) event.preventDefault()
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            finishDrop(position)
                          }}
                          className={`flex min-h-44 flex-col gap-2 rounded-sm border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rs-gold ${selectedPosition === position ? 'border-rs-gold bg-rs-raised ring-1 ring-rs-gold' : 'border-rs-border/60 bg-rs-inset/40 hover:border-rs-gold/60'}`}
                        >
                          <span className="text-xs text-rs-muted">
                            {String(position).padStart(2, '0')}
                          </span>
                          {card ? (
                            <>
                              <BoardCardPreview card={card} />
                              <span className="text-xs text-rs-muted">v{key.split(':')[1]}</span>
                            </>
                          ) : (
                            <span className="flex flex-1 flex-col items-center justify-center gap-3 text-xs text-rs-muted">
                              <AddOutlinedIcon className="text-rs-gold/50" aria-hidden="true" />
                              {t('boards.emptyPosition')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {editable && filled < POSITIONS.length && (
                    <div
                      role="region"
                      aria-label={t('boards.dropZone')}
                      onDragOver={(event) => {
                        if (dragging.current && editable) {
                          event.preventDefault()
                          setDragOver(true)
                        }
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                          setDragOver(false)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        finishDrop()
                      }}
                      className={`mt-3 flex min-h-40 flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed p-6 text-center ${dragOver ? 'border-rs-gold bg-rs-raised' : 'border-rs-border bg-rs-inset/40'}`}
                    >
                      <AddOutlinedIcon className="text-rs-gold" aria-hidden="true" />
                      <p className="text-sm text-rs-gold">{t('boards.dropZone')}</p>
                      <p className="text-xs text-rs-muted">{t('boards.dropAlternative')}</p>
                    </div>
                  )}
                  {selectedCard && (
                    <section
                      aria-label={t('boards.selectedRules', { position: selectedPosition })}
                      className="mt-4 rounded-sm border border-rs-border/60 bg-rs-inset/40 p-4"
                    >
                      <h3 className="mb-3 font-display text-sm text-rs-gold-bright">
                        {t('boards.selectedRules', { position: selectedPosition })} ·{' '}
                        {selectedCard.name}
                      </h3>
                      <CardRuleDetails card={selectedCard} />
                    </section>
                  )}
                </div>
              </>
            )}
          </Panel>
          <Panel className="min-w-0 xl:sticky xl:top-4">
            <div className="space-y-3 border-b border-rs-border p-4">
              <h2 className="font-display text-lg text-rs-gold-bright">{t('boards.catalog')}</h2>
              <p className="text-xs leading-relaxed text-rs-muted">{t('boards.catalogHint')}</p>
              <button
                type="button"
                onClick={addAll}
                disabled={!canAddAll}
                className="w-full rounded-sm border border-rs-gold bg-rs-raised px-3 py-2 text-sm font-semibold text-rs-gold disabled:opacity-40"
              >
                {t('boards.addAll')}
              </button>
              <p className="text-xs text-rs-muted">{t('boards.addAllHint')}</p>
              <input
                type="search"
                aria-label={t('boards.search')}
                placeholder={t('boards.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-sm text-rs-text"
              />
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {cards.isLoading ? (
                <p role="status">{t('common.loading')}</p>
              ) : cards.isError ? (
                <div role="alert">
                  <p>{t('common.apiError')}</p>
                  <button onClick={() => void cards.refetch()}>{t('auth.retry')}</button>
                </div>
              ) : !cardOptions.length ? (
                <div className="space-y-3 p-2 text-sm text-rs-muted">
                  <p>{t('boards.noCards')}</p>
                  <Link className="text-rs-gold underline" to="/admin/cards">
                    {t('boards.manageCatalog')}
                  </Link>
                </div>
              ) : !visibleCards.length ? (
                <p className="p-2 text-sm text-rs-muted">{t('boards.noResults')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visibleCards.map(({ key, card }) => {
                    const used = Object.values(assignments).some(
                      (value) => value.split(':')[0] === card.id,
                    )
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={t('boards.addCard', { name: card.revision.name })}
                        disabled={!editable || used || filled === POSITIONS.length}
                        draggable={editable && !used && filled < POSITIONS.length}
                        onDragStart={(event) => {
                          dragging.current = { key }
                          event.dataTransfer.effectAllowed = 'copy'
                          event.dataTransfer.setData('text/plain', key)
                        }}
                        onDragEnd={() => {
                          dragging.current = null
                          setDragOver(false)
                        }}
                        onClick={() => assign(key)}
                        className="cursor-grab active:cursor-grabbing space-y-2 rounded-sm border border-rs-border bg-rs-raised p-2 text-left text-sm hover:border-rs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rs-gold disabled:cursor-default disabled:opacity-60"
                      >
                        <BoardCardPreview card={card.revision} />
                        <span className="block text-xs text-rs-muted">
                          {used ? t('boards.inBoard') : `v${card.current_revision}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}
