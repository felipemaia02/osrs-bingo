import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { useTranslation } from 'react-i18next'
import { useEvents } from '../hooks/useEvents'

export function ActiveEventIndicator() {
  const { t } = useTranslation()
  const { data: events = [], isLoading, isError } = useEvents('active')
  const event = events.find((candidate) => candidate.status === 'active')
  const label = isLoading
    ? t('common.loading')
    : isError
      ? t('common.apiError')
      : event
        ? `${event.name} · ${t('events.status.active')}`
        : t('events.noActive')
  return (
    <div
      role="status"
      aria-label={t('events.selector.label')}
      className="flex min-w-0 items-center gap-2 text-xs text-rs-muted"
    >
      <EventOutlinedIcon fontSize="small" aria-hidden="true" />
      <span title={label} className="max-w-40 truncate sm:max-w-56">
        {label}
      </span>
    </div>
  )
}
