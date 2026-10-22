import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { useNow } from '../../../hooks/useNow'
import { splitDuration } from '../../../lib/time/duration'
import { useEvents } from '../hooks/useEvents'
import type { BingoEvent } from '../types'

type Variant = 'pill' | 'bar'

/** "13 d 22 h", "Starts in 2 d 4 h" or "Scheduled end reached" for the active event. */
function useRemainingLabel(event: BingoEvent): string {
  const { t } = useTranslation()
  const now = useNow()
  const start = Date.parse(event.start_at)
  const end = Date.parse(event.end_at)
  const format = (ms: number) => {
    const { days, hours, minutes } = splitDuration(ms)
    return days > 0
      ? t('shell.event.daysHours', { days, hours })
      : t('shell.event.hoursMinutes', { hours, minutes })
  }
  if (now < start) return t('shell.event.startsIn', { time: format(start - now) })
  if (now < end) return format(end - now)
  return t('shell.event.ended')
}

function EventDetails({ event, variant }: { event: BingoEvent; variant: Variant }) {
  const { t } = useTranslation()
  const remaining = useRemainingLabel(event)
  return (
    <>
      <span className={`truncate ${variant === 'bar' ? 'flex-1' : 'max-w-56'}`} title={event.name}>
        {event.name}
      </span>
      <Badge tone="success">{t('events.status.active')}</Badge>
      <span className="whitespace-nowrap text-rs-muted">
        {variant === 'pill' ? `· ${remaining}` : remaining}
      </span>
    </>
  )
}

/** Active-event pill (desktop header) or bar (under the mobile header). Never selects events. */
export function ActiveEventStatus({ variant }: { variant: Variant }) {
  const { t } = useTranslation()
  const { data: events = [], isLoading, isError } = useEvents('active')
  const event = events.find((candidate) => candidate.status === 'active')
  const className =
    variant === 'pill'
      ? 'inline-flex min-h-9 min-w-0 items-center gap-2 rounded-[3px] border border-rs-border px-3 text-[13px] text-rs-text hover:border-rs-border-strong'
      : 'flex min-h-11 items-center gap-2 border-b border-rs-border/60 bg-rs-surface px-4 py-2 text-[13px] text-rs-text'
  const icon = (
    <EventOutlinedIcon
      sx={{ fontSize: variant === 'pill' ? 20 : 18 }}
      className={variant === 'bar' ? 'text-rs-gold' : undefined}
      aria-hidden="true"
    />
  )

  if (!event) {
    const message = isLoading
      ? t('common.loading')
      : isError
        ? t('common.apiError')
        : t('shell.event.none')
    return (
      <div role="status" className={`${className} text-rs-muted`}>
        {icon}
        <span>{message}</span>
      </div>
    )
  }
  return (
    <Link to="/" aria-label={t('shell.event.label', { name: event.name })} className={className}>
      {icon}
      <EventDetails event={event} variant={variant} />
    </Link>
  )
}
