import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { DateTimeField } from '../../../components/ui/DateTimeField'

interface EventScheduleFieldsProps {
  start: Dayjs | null
  end: Dayjs | null
  onStartChange: (value: Dayjs | null) => void
  onEndChange: (value: Dayjs | null) => void
}

const PRESETS = [1, 7, 14] as const

export function EventScheduleFields({
  start,
  end,
  onStartChange,
  onEndChange,
}: EventScheduleFieldsProps) {
  const { t } = useTranslation()
  const invalidEnd = Boolean(start && end && !end.isAfter(start))
  const durationHours = start && end && end.isAfter(start) ? end.diff(start, 'hour', true) : 0
  const durationDays = durationHours / 24
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  function changeStart(value: Dayjs | null) {
    onStartChange(value)
    if (value && (!end || !end.isAfter(value))) onEndChange(value.add(7, 'day'))
  }

  return (
    <fieldset className="space-y-3 rounded-sm border border-rs-border/50 bg-rs-raised/40 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-rs-gold">
        {t('events.schedule.title')}
      </legend>
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <DateTimeField label={t('events.form.start')} value={start} onChange={changeStart} />
        <ArrowForwardOutlinedIcon
          className="mt-2 hidden text-rs-muted md:block"
          aria-hidden="true"
        />
        <DateTimeField
          label={t('events.form.end')}
          value={end}
          onChange={onEndChange}
          minDateTime={start?.add(1, 'minute')}
          error={invalidEnd}
          helperText={invalidEnd ? t('events.schedule.invalidEnd') : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-rs-muted">{t('events.schedule.quickDuration')}</span>
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            disabled={!start}
            onClick={() => start && onEndChange(start.add(days, 'day'))}
            className="rounded-sm border border-rs-border/60 bg-rs-inset px-2 py-1 text-[11px] text-rs-muted hover:border-rs-border-strong hover:text-rs-gold-bright disabled:opacity-40"
          >
            +{days} {t(days === 1 ? 'events.schedule.day' : 'events.schedule.days')}
          </button>
        ))}
      </div>

      <div className="grid gap-2 text-[11px] text-rs-muted sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <EventAvailableOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('events.schedule.duration')}:{' '}
          <strong className="text-rs-text">
            {durationDays > 0
              ? t('events.schedule.durationValue', { days: Number(durationDays.toFixed(1)) })
              : '—'}
          </strong>
        </p>
        <p className="flex items-center gap-2">
          <ScheduleOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('events.schedule.timezone')}: <strong className="text-rs-text">{timezone}</strong>
        </p>
      </div>
    </fieldset>
  )
}
