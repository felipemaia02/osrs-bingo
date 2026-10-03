import { useState, type FormEvent } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { AxiosError } from 'axios'
import dayjs, { type Dayjs } from 'dayjs'
import { useSession } from '../../auth/hooks/useSession'
import { EventRegistration } from '../../teams/components/EventRegistration'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { EventScheduleFields } from '../components/EventScheduleFields'
import { useEventMutations, useEvents } from '../hooks/useEvents'
import type { BingoEvent, EventPayload, EventStatus } from '../types'

type EventFilter = EventStatus | 'all'
type PendingTransition = { event: BingoEvent; action: 'activate' | 'finish' }

interface EventFormState {
  name: string
  description: string
  startAt: Dayjs | null
  endAt: Dayjs | null
}

function initialForm(): EventFormState {
  const now = dayjs()
  const minutesToQuarter = (15 - (now.minute() % 15)) % 15
  const startAt = now.add(minutesToQuarter, 'minute').second(0).millisecond(0)
  return { name: '', description: '', startAt, endAt: startAt.add(7, 'day') }
}

const ERROR_TRANSLATION: Record<string, string> = {
  'Active event limit reached': 'events.errors.activeLimit',
  'Only draft events can be edited': 'events.errors.readOnly',
  'Event status does not allow this transition': 'events.errors.invalidTransition',
  'Event not found': 'events.errors.notFound',
}

export function EventsPage({ management = false }: { management?: boolean }) {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const isAdmin = management && session.data?.is_admin === true
  const [filter, setFilter] = useState<EventFilter>('all')
  const [editingEvent, setEditingEvent] = useState<BingoEvent | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(initialForm)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null)
  const { data: events = [], isLoading, isError } = useEvents(filter === 'all' ? undefined : filter)
  const mutations = useEventMutations()
  const isSaving = mutations.createEvent.isPending || mutations.updateEvent.isPending

  function errorMessage(error: unknown): string {
    const detail = error instanceof AxiosError ? error.response?.data?.detail : null
    if (typeof detail === 'string') return t(ERROR_TRANSLATION[detail] ?? 'common.apiError')
    return t('common.apiError')
  }

  function openEdit(event: BingoEvent) {
    setIsFormOpen(true)
    setEditingEvent(event)
    setForm({
      name: event.name,
      description: event.description ?? '',
      startAt: dayjs(event.start_at),
      endAt: dayjs(event.end_at),
    })
    setFeedback(null)
  }

  function resetForm() {
    setEditingEvent(null)
    setForm(initialForm())
    setIsFormOpen(false)
  }

  function openCreate() {
    setEditingEvent(null)
    setForm(initialForm())
    setFeedback(null)
    setIsFormOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    if (!form.startAt || !form.endAt || !form.endAt.isAfter(form.startAt)) {
      setFeedback(t('events.schedule.invalidEnd'))
      return
    }
    const payload: EventPayload = {
      name: form.name,
      description: form.description || null,
      start_at: form.startAt.toISOString(),
      end_at: form.endAt.toISOString(),
    }
    try {
      if (editingEvent)
        await mutations.updateEvent.mutateAsync({ eventId: editingEvent.id, payload })
      else await mutations.createEvent.mutateAsync(payload)
      setFeedback(t(editingEvent ? 'events.feedback.updated' : 'events.feedback.created'))
      resetForm()
    } catch (error) {
      setFeedback(errorMessage(error))
    }
  }

  async function transition({ event, action }: PendingTransition) {
    setFeedback(null)
    try {
      if (action === 'activate') await mutations.activateEvent.mutateAsync(event.id)
      else await mutations.finishEvent.mutateAsync(event.id)
      setFeedback(
        t(action === 'activate' ? 'events.feedback.activated' : 'events.feedback.finished'),
      )
      setPendingTransition(null)
    } catch (error) {
      setFeedback(errorMessage(error))
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rs-gold">
            {t(management ? 'events.eyebrow' : 'events.publicEyebrow')}
          </p>
          <h1 className="font-display text-2xl font-bold text-rs-text sm:text-3xl">
            {t('events.title')}
          </h1>
          <p className="mt-1 text-sm text-rs-muted">
            {t(management ? 'events.description' : 'events.publicDescription')}
          </p>
        </div>

        <div>
          {new URLSearchParams(window.location.search).get('login') === 'failed' && (
            <p role="alert" className="mb-4 text-sm text-rs-muted">
              {t('auth.loginFailed')}
            </p>
          )}
          {feedback && !isFormOpen && (
            <p
              role="status"
              className="mb-4 rounded-sm border border-rs-border/50 bg-rs-inset p-3 text-sm text-rs-text"
            >
              {feedback}
            </p>
          )}
          <Panel as="section" aria-labelledby="event-list-title" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rs-border/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id="event-list-title"
                  className="font-display text-sm font-bold text-rs-gold-bright"
                >
                  {t('events.listTitle')}
                </h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="rounded-sm border border-rs-border-strong bg-rs-gold px-3 py-2 text-sm font-semibold text-rs-inset"
                  >
                    {t('events.actions.create')}
                  </button>
                )}
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as EventFilter)}
                aria-label={t('events.filter.label')}
                className="rounded-sm border border-rs-border/60 bg-rs-inset px-3 py-2 text-sm text-rs-text"
              >
                {(['all', 'draft', 'active', 'finished'] as const).map((status) => (
                  <option key={status} value={status}>
                    {t(`events.filter.${status}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-rs-border/40">
              {isLoading && <StateMessage message={t('common.loading')} />}
              {isError && <StateMessage message={t('common.apiError')} />}
              {!isLoading && !isError && events.length === 0 && (
                <StateMessage message={t('events.empty')} />
              )}
              {events.map((event) => (
                <article key={event.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <EventOutlinedIcon
                          className="text-rs-gold"
                          fontSize="small"
                          aria-hidden="true"
                        />
                        <h3 className="font-semibold text-rs-text">{event.name}</h3>
                        <span className="rounded-sm border border-rs-border/60 bg-rs-inset px-2 py-0.5 text-[10px] font-semibold text-rs-muted">
                          {t(`events.status.${event.status}`)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="mt-2 text-sm text-rs-muted">{event.description}</p>
                      )}
                      <p className="mt-2 text-xs text-rs-muted">
                        {new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(event.start_at))}
                        {' — '}
                        {new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(event.end_at))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && event.status === 'draft' && (
                        <>
                          <ActionButton
                            label={t('common.edit')}
                            icon={<EditOutlinedIcon fontSize="small" />}
                            onClick={() => openEdit(event)}
                          />
                          <ActionButton
                            label={t('events.actions.activate')}
                            icon={<PlayArrowIcon fontSize="small" />}
                            onClick={() => setPendingTransition({ event, action: 'activate' })}
                          />
                        </>
                      )}
                      {isAdmin && event.status === 'active' && (
                        <ActionButton
                          label={t('events.actions.finish')}
                          icon={<CheckCircleOutlinedIcon fontSize="small" />}
                          onClick={() => setPendingTransition({ event, action: 'finish' })}
                        />
                      )}
                    </div>
                  </div>
                  {!management && <EventRegistration event={event} />}
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      {isAdmin && isFormOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-form-title"
          >
            <EventForm
              form={form}
              setForm={setForm}
              editing={Boolean(editingEvent)}
              saving={isSaving}
              feedback={feedback}
              onSubmit={submit}
              onCancel={resetForm}
            />
          </div>
        </div>
      )}
      {isAdmin && pendingTransition && (
        <ConfirmationDialog
          event={pendingTransition.event}
          action={pendingTransition.action}
          isPending={mutations.activateEvent.isPending || mutations.finishEvent.isPending}
          onCancel={() => setPendingTransition(null)}
          onConfirm={() => void transition(pendingTransition)}
        />
      )}
    </AppShell>
  )
}

interface EventFormProps {
  form: EventFormState
  setForm: (form: EventFormState) => void
  editing: boolean
  saving: boolean
  feedback: string | null
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}

function EventForm({
  form,
  setForm,
  editing,
  saving,
  feedback,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const { t } = useTranslation()
  const fieldClass =
    'w-full rounded-sm border border-rs-border/60 bg-rs-inset px-3 py-2 text-sm text-rs-text placeholder:text-rs-muted/60'
  return (
    <Panel
      as="section"
      aria-labelledby="event-form-title"
      className="h-fit p-4 lg:sticky lg:top-20"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AddOutlinedIcon className="text-rs-gold" fontSize="small" aria-hidden="true" />
          <h2 id="event-form-title" className="font-display text-sm font-bold text-rs-gold-bright">
            {t(editing ? 'events.form.editTitle' : 'events.form.createTitle')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('common.close')}
          className="text-rs-muted hover:text-rs-gold-bright"
        >
          <CloseOutlinedIcon fontSize="small" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-xs font-medium text-rs-muted">
          {t('events.form.name')}
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs font-medium text-rs-muted">
          {t('events.form.description')}
          <textarea
            maxLength={2000}
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={`mt-1 resize-y ${fieldClass}`}
          />
        </label>
        <EventScheduleFields
          start={form.startAt}
          end={form.endAt}
          onStartChange={(startAt) => setForm({ ...form, startAt })}
          onEndChange={(endAt) => setForm({ ...form, endAt })}
        />
        {feedback && (
          <p
            role="status"
            className="rounded-sm border border-rs-border/50 bg-rs-inset p-2 text-xs text-rs-text"
          >
            {feedback}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            disabled={saving}
            className="rounded-sm border border-rs-border-strong bg-rs-gold px-3 py-2 text-sm font-semibold text-rs-inset disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-muted hover:text-rs-text"
          >
            {t('common.close')}
          </button>
        </div>
      </form>
    </Panel>
  )
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-sm border border-rs-border/60 bg-rs-inset text-rs-muted hover:border-rs-border-strong hover:text-rs-gold-bright"
    >
      {icon}
    </button>
  )
}

function StateMessage({ message }: { message: string }) {
  return <p className="p-8 text-center text-sm text-rs-muted">{message}</p>
}

function ConfirmationDialog({
  event,
  action,
  isPending,
  onCancel,
  onConfirm,
}: {
  event: BingoEvent
  action: 'activate' | 'finish'
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const isActivate = action === 'activate'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-dialog-title"
        className="w-full max-w-md rounded border border-rs-border bg-rs-surface p-5 shadow-rs-panel"
      >
        <h2
          id="transition-dialog-title"
          className="font-display text-lg font-bold text-rs-gold-bright"
        >
          {t(isActivate ? 'events.confirm.activateTitle' : 'events.confirm.finishTitle')}
        </h2>
        <p className="mt-3 text-sm text-rs-text">
          {t(isActivate ? 'events.confirm.activateMessage' : 'events.confirm.finishMessage', {
            name: event.name,
          })}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-muted"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-sm border border-rs-border-strong bg-rs-gold px-3 py-2 text-sm font-semibold text-rs-inset disabled:opacity-50"
          >
            {t(
              isPending
                ? 'common.saving'
                : isActivate
                  ? 'events.confirm.activate'
                  : 'events.confirm.finish',
            )}
          </button>
        </div>
      </section>
    </div>
  )
}
