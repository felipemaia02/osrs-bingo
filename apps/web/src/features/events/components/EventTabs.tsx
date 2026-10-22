import { useTranslation } from 'react-i18next'
import { EVENT_TABS, type EventTab } from '../hooks/useEventTabs'

interface EventTabsProps {
  tab: EventTab
  counts: Record<EventTab, number>
  onChange: (tab: EventTab) => void
  mobile: boolean
}

export const EVENT_PANEL_ID = 'events-panel'

/** Status tabs with counts: underline tabs on desktop, chips on mobile (teams v2 pattern). */
export function EventTabs({ tab, counts, onChange, mobile }: EventTabsProps) {
  const { t } = useTranslation()
  return (
    <div
      role="tablist"
      aria-label={t('events.filter.label')}
      className={
        mobile ? 'flex gap-1.5 overflow-x-auto pb-0.5' : 'flex border-b border-rs-border px-2'
      }
    >
      {EVENT_TABS.map((value) => {
        const active = tab === value
        const className = mobile
          ? `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
              active
                ? 'border-rs-gold bg-rs-gold font-semibold text-rs-canvas'
                : 'border-rs-border bg-rs-inset text-rs-text'
            }`
          : `-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm ${
              active
                ? 'border-rs-gold font-semibold text-rs-gold-bright'
                : 'border-transparent text-rs-muted'
            }`
        return (
          <button
            key={value}
            type="button"
            role="tab"
            id={`events-tab-${value}`}
            aria-controls={EVENT_PANEL_ID}
            aria-selected={active}
            onClick={() => onChange(value)}
            className={className}
          >
            {t(`events.filter.${value}`)}{' '}
            {mobile ? (
              counts[value]
            ) : (
              <span
                className={`min-w-[22px] rounded-[10px] border px-1.5 text-center text-xs ${
                  active
                    ? 'border-rs-gold bg-rs-gold text-rs-canvas'
                    : 'border-rs-border bg-rs-raised text-rs-text'
                }`}
              >
                {counts[value]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
