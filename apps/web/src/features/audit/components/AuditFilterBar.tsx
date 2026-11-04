import { useTranslation } from 'react-i18next'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import type { BingoEvent } from '../../events/types'
import { AUDIT_GROUPS, type AuditFilters, type AuditGroup } from '../types'

interface AuditFilterBarProps {
  filters: AuditFilters
  events: BingoEvent[]
  onChange: (filters: AuditFilters) => void
}

const LABEL = 'flex min-w-0 flex-col gap-1 text-xs font-semibold text-rs-muted'

/** Event, action group, actor and date range (FR-004). */
export function AuditFilterBar({ filters, events, onChange }: AuditFilterBarProps) {
  const { t } = useTranslation()
  const set = (changes: Partial<AuditFilters>) => onChange({ ...filters, ...changes })

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <label className={`${LABEL} col-span-2 md:col-span-1`}>
        {t('audit.filters.event')}
        <select
          value={filters.eventId}
          onChange={(event) => set({ eventId: event.target.value })}
          className={FIELD_CLASS}
        >
          <option value="">{t('audit.filters.allEvents')}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        {t('audit.filters.group')}
        <select
          value={filters.group}
          onChange={(event) => set({ group: event.target.value as AuditGroup | '' })}
          className={FIELD_CLASS}
        >
          <option value="">{t('audit.filters.allGroups')}</option>
          {AUDIT_GROUPS.map((group) => (
            <option key={group} value={group}>
              {t(`audit.groups.${group}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        {t('audit.filters.actor')}
        <input
          type="search"
          maxLength={64}
          value={filters.actor}
          onChange={(event) => set({ actor: event.target.value })}
          placeholder={t('audit.filters.actorPlaceholder')}
          className={FIELD_CLASS}
        />
      </label>
      <label className={LABEL}>
        {t('audit.filters.from')}
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(event) => set({ from: event.target.value })}
          className={FIELD_CLASS}
        />
      </label>
      <label className={LABEL}>
        {t('audit.filters.to')}
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(event) => set({ to: event.target.value })}
          className={FIELD_CLASS}
        />
      </label>
    </div>
  )
}
