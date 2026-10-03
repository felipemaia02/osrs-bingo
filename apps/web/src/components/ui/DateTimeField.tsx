import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import dayjs, { type Dayjs } from 'dayjs'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

interface DateTimeFieldProps {
  label: string
  value: Dayjs | null
  onChange: (value: Dayjs | null) => void
  minDateTime?: Dayjs
  error?: boolean
  helperText?: string
}

const fieldSx = {
  '& .MuiInputLabel-root': { color: '#aa9a7c' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#f1d487' },
  '& .MuiOutlinedInput-root': {
    color: '#ead9b7',
    backgroundColor: '#19120e',
    borderRadius: '2px',
    '& fieldset': { borderColor: 'rgb(112 90 57 / 70%)' },
    '&:hover fieldset': { borderColor: '#a88647' },
    '&.Mui-focused fieldset': { borderColor: '#d4ad53' },
  },
  '& .MuiInputBase-input': { padding: '10px 8px', fontSize: '0.82rem' },
  '& .MuiIconButton-root': { color: '#d4ad53' },
}

const pickerSx = {
  '& .MuiPaper-root': { color: '#ead9b7', backgroundColor: '#211914', backgroundImage: 'none' },
  '& .MuiPickersDay-root': { color: '#ead9b7' },
  '& .MuiPickersDay-root.Mui-selected': { color: '#19120e', backgroundColor: '#d4ad53' },
  '& .MuiClock-root': { backgroundColor: '#211914' },
  '& .MuiClockNumber-root': { color: '#ead9b7' },
  '& .MuiPickersToolbar-root': { backgroundColor: '#2d2119' },
  '& .MuiPickersToolbarText-root': { color: '#ead9b7' },
}

export function DateTimeField({
  label,
  value,
  onChange,
  minDateTime,
  error,
  helperText,
}: DateTimeFieldProps) {
  const [timeOpen, setTimeOpen] = React.useState(false)
  const [draftTime, setDraftTime] = React.useState(value ?? dayjs())
  const minimumDate = minDateTime?.startOf('day')
  const changeDate = (date: Dayjs | null) =>
    onChange(date ? date.hour(value?.hour() ?? 0).minute(value?.minute() ?? 0) : null)
  const minimumTime =
    minDateTime && value?.isSame(minDateTime, 'day') ? minDateTime.format('HH:mm') : undefined
  const openTime = () => {
    setDraftTime(value ?? dayjs())
    setTimeOpen(true)
  }
  const confirmTime = () => {
    if (!value) return
    onChange(value.hour(draftTime.hour()).minute(draftTime.minute()))
    setTimeOpen(false)
  }

  return (
    <div className="min-w-0 space-y-1">
      <span className="block text-[11px] font-medium text-rs-muted">{label}</span>
      <div className="grid min-w-0 grid-cols-[minmax(0,1.25fr)_minmax(6.5rem,0.75fr)] gap-2">
        <DatePicker
          value={value}
          onChange={changeDate}
          minDate={minimumDate}
          format="DD/MM/YYYY"
          slots={{ openPickerIcon: CalendarMonthOutlinedIcon }}
          slotProps={{
            textField: { required: true, fullWidth: true, size: 'small', sx: fieldSx },
            popper: { sx: pickerSx },
          }}
        />
        <button
          type="button"
          onClick={openTime}
          aria-label={`${label} time`}
          className="flex min-w-0 items-center justify-between rounded-sm border border-rs-border/70 bg-rs-inset px-2 py-2 text-sm text-rs-text hover:border-rs-border-strong"
        >
          <span>{value?.format('HH:mm') ?? '--:--'}</span>
          <AccessTimeOutlinedIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
        </button>
      </div>
      {error && helperText && <p className="text-[11px] text-rs-danger">{helperText}</p>}
      {timeOpen && (
        <MaterialTimeDialog
          draft={draftTime}
          minimumTime={minimumTime}
          onChange={setDraftTime}
          onCancel={() => setTimeOpen(false)}
          onConfirm={confirmTime}
        />
      )}
    </div>
  )
}

function MaterialTimeDialog({
  draft,
  minimumTime,
  onChange,
  onCancel,
  onConfirm,
}: {
  draft: Dayjs
  minimumTime?: string
  onChange: (value: Dayjs) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const [part, setPart] = React.useState<'hour' | 'minute'>('hour')
  const hours = Array.from({ length: 12 }, (_, index) => index + 1)
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5)
  const minimum = minimumTime ? minimumTime.split(':').map(Number) : null
  const isAllowed = (hour: number, minute: number) =>
    !minimum || hour > minimum[0] || (hour === minimum[0] && minute >= minimum[1])
  const isPm = draft.hour() >= 12
  const displayHour = draft.hour() % 12 || 12
  const selectHour = (hour: number) => {
    onChange(draft.hour((hour % 12) + (isPm ? 12 : 0)))
    setPart('minute')
  }
  const selectMinute = (minute: number) => onChange(draft.minute(minute))
  const clockValues = part === 'hour' ? hours : minutes
  const selectedClockValue = part === 'hour' ? displayHour : draft.minute()
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-dialog-title"
        className="w-full max-w-sm rounded-[28px] bg-rs-surface p-6 text-rs-text shadow-rs-panel"
      >
        <div className="flex items-center justify-between">
          <h2
            id="time-dialog-title"
            className="font-display text-base font-bold text-rs-gold-bright"
          >
            Select time
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-rs-muted hover:text-rs-text"
          >
            <CloseOutlinedIcon />
          </button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-4xl font-semibold">
          <button
            type="button"
            onClick={() => setPart('hour')}
            className={`rounded-xl px-4 py-3 ${part === 'hour' ? 'bg-rs-info text-white' : 'bg-rs-raised text-rs-muted'}`}
          >
            {String(displayHour).padStart(2, '0')}
          </button>
          <span className="text-rs-gold">:</span>
          <button
            type="button"
            onClick={() => setPart('minute')}
            className={`rounded-xl px-4 py-3 ${part === 'minute' ? 'bg-rs-info text-white' : 'bg-rs-raised text-rs-muted'}`}
          >
            {String(draft.minute()).padStart(2, '0')}
          </button>
          <span className="ml-2 flex flex-col text-xs font-semibold">
            <button
              type="button"
              onClick={() =>
                onChange(draft.hour(draft.hour() - (isPm ? 12 : 0) + (!isPm ? 12 : 0)))
              }
              className={
                !isPm ? 'rounded bg-rs-gold px-2 py-1 text-rs-inset' : 'px-2 py-1 text-rs-muted'
              }
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => onChange(draft.hour((draft.hour() % 12) + 12))}
              className={
                isPm ? 'rounded bg-rs-gold px-2 py-1 text-rs-inset' : 'px-2 py-1 text-rs-muted'
              }
            >
              PM
            </button>
          </span>
        </div>
        <div className="relative mx-auto mt-5 size-64 rounded-full bg-rs-raised/60">
          <div className="absolute inset-8 rounded-full bg-rs-raised/70" />
          {clockValues.map((item, index) => {
            const angle = index * 30 - 90
            const selected = selectedClockValue === item
            const allowed =
              part === 'hour'
                ? hours.some((hour) => isAllowed((hour % 12) + (isPm ? 12 : 0), draft.minute())) &&
                  isAllowed((item % 12) + (isPm ? 12 : 0), draft.minute())
                : isAllowed(draft.hour(), item)
            return (
              <button
                key={item}
                type="button"
                disabled={!allowed}
                onClick={() => (part === 'hour' ? selectHour(item) : selectMinute(item))}
                className={`absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full text-sm ${selected ? 'bg-rs-gold text-rs-inset' : 'text-rs-text hover:bg-rs-info/40'} disabled:opacity-30`}
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-6.7rem) rotate(${-angle}deg)`,
                }}
              >
                {part === 'hour' ? item : String(item).padStart(2, '0')}
              </button>
            )
          })}
          <div
            className="absolute left-1/2 top-1/2 h-1/2 w-0.5 origin-top -translate-x-1/2 bg-rs-gold"
            style={{
              transform: `translateX(-50%) rotate(${(selectedClockValue / (part === 'hour' ? 12 : 60)) * 360}deg)`,
            }}
          />
          <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rs-gold" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold text-rs-gold"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-rs-gold px-4 py-2 text-sm font-semibold text-rs-inset"
          >
            OK
          </button>
        </div>
      </section>
    </div>
  )
}
