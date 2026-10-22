import { useState, type FormEvent } from 'react'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { eventErrorKey } from '../errors'
import type { BingoEvent, EventPayload } from '../types'
import { EventScheduleFields } from './EventScheduleFields'

const DEFAULT_DURATION_DAYS = 7
const QUARTER_HOUR = 15

interface EventFormState {
  name: string
  description: string
  startAt: Dayjs | null
  endAt: Dayjs | null
}

function initialForm(event: BingoEvent | null): EventFormState {
  if (event)
    return {
      name: event.name,
      description: event.description ?? '',
      startAt: dayjs(event.start_at),
      endAt: dayjs(event.end_at),
    }
  const now = dayjs()
  const toQuarter = (QUARTER_HOUR - (now.minute() % QUARTER_HOUR)) % QUARTER_HOUR
  const startAt = now.add(toQuarter, 'minute').second(0).millisecond(0)
  return { name: '', description: '', startAt, endAt: startAt.add(DEFAULT_DURATION_DAYS, 'day') }
}

interface EventFormModalProps {
  /** null creates a new event. */
  event: BingoEvent | null
  saving: boolean
  onSave: (payload: EventPayload) => Promise<void>
  onClose: () => void
}

/** Create/edit event form in the shared modal; errors stay inside, inputs are kept on failure. */
export function EventFormModal({ event, saving, onSave, onClose }: EventFormModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() => initialForm(event))
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    setErrorKey(null)
    if (!form.startAt || !form.endAt || !form.endAt.isAfter(form.startAt)) {
      setErrorKey('events.schedule.invalidEnd')
      return
    }
    try {
      await onSave({
        name: form.name,
        description: form.description || null,
        start_at: form.startAt.toISOString(),
        end_at: form.endAt.toISOString(),
      })
    } catch (error) {
      setErrorKey(eventErrorKey(error))
    }
  }

  return (
    <FormModal
      title={t(event ? 'events.form.editTitle' : 'events.form.createTitle')}
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('events.form.name')}
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(change) => setForm({ ...form, name: change.target.value })}
            className={`${FIELD_CLASS} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('events.form.description')}
          <textarea
            maxLength={2000}
            rows={3}
            value={form.description}
            onChange={(change) => setForm({ ...form, description: change.target.value })}
            className={`${FIELD_CLASS} resize-y py-2 font-normal`}
          />
        </label>
        <EventScheduleFields
          start={form.startAt}
          end={form.endAt}
          onStartChange={(startAt) => setForm({ ...form, startAt })}
          onEndChange={(endAt) => setForm({ ...form, endAt })}
        />
        {errorKey && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t(errorKey)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
            {t(saving ? 'common.saving' : 'common.save')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
