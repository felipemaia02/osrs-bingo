import { useEffect } from 'react'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { useTranslation } from 'react-i18next'
import { useEvents } from '../hooks/useEvents'
import { useEventSelectionStore } from '../store/eventSelectionStore'

export function EventSelector() {
  const { t } = useTranslation()
  const { data: events = [], isLoading } = useEvents('active')
  const selectedEventId = useEventSelectionStore((state) => state.selectedEventId)
  const selectEvent = useEventSelectionStore((state) => state.selectEvent)
  const clearSelection = useEventSelectionStore((state) => state.clearSelection)

  useEffect(() => {
    if (selectedEventId && !events.some((event) => event.id === selectedEventId)) clearSelection()
  }, [clearSelection, events, selectedEventId])

  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-rs-muted">
      <EventOutlinedIcon fontSize="small" aria-hidden="true" />
      <span className="sr-only">{t('events.selector.label')}</span>
      <select
        value={selectedEventId ?? ''}
        onChange={(event) =>
          event.target.value ? selectEvent(event.target.value) : clearSelection()
        }
        disabled={isLoading || events.length === 0}
        className="max-w-40 rounded-sm border border-rs-border/60 bg-rs-inset px-2 py-1.5 text-xs text-rs-text disabled:opacity-50 sm:max-w-56"
        aria-label={t('events.selector.label')}
      >
        <option value="">
          {isLoading ? t('common.loading') : t('events.selector.placeholder')}
        </option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name} · {t(`events.status.${event.status}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
