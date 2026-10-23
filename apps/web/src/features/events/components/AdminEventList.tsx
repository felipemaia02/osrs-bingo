import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import type { BingoEvent } from '../types'
import { EventActions, type EventTransition } from './EventActions'
import { EventSchedule } from './EventSchedule'
import { EventStatusBadge } from './EventStatusBadge'

interface AdminEventListProps {
  events: BingoEvent[]
  onEdit: (event: BingoEvent) => void
  onRules: (event: BingoEvent) => void
  onTransition: (event: BingoEvent, action: EventTransition) => void
}

/** Drafts can't be activated until both line bonuses are set (feature 006). */
function RulesBadge({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const missing = event.row_bonus == null || event.column_bonus == null
  return event.status === 'draft' && missing ? (
    <Badge tone="gold">{t('events.rules.missing')}</Badge>
  ) : null
}

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

/** Desktop table: event, status, schedule and per-status actions. */
export function AdminEventTable({ events, onEdit, onRules, onTransition }: AdminEventListProps) {
  const { t } = useTranslation()
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={HEAD}>{t('events.table.event')}</th>
          <th className={HEAD}>{t('events.table.status')}</th>
          <th className={HEAD}>{t('events.table.schedule')}</th>
          <th className={`${HEAD} text-right`}>{t('events.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td className={`${CELL} max-w-[360px]`}>
              <span className="block font-semibold">{event.name}</span>
              {event.description && (
                <span className="block truncate text-xs text-rs-muted" title={event.description}>
                  {event.description}
                </span>
              )}
            </td>
            <td className={CELL}>
              <span className="flex flex-wrap items-center gap-1.5">
                <EventStatusBadge status={event.status} />
                <RulesBadge event={event} />
              </span>
            </td>
            <td className={CELL}>
              <EventSchedule event={event} />
            </td>
            <td className={`${CELL} text-right`}>
              <EventActions
                event={event}
                mobile={false}
                onEdit={onEdit}
                onRules={onRules}
                onTransition={onTransition}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Mobile cards with the same content and 44 px actions. */
export function AdminEventCards({ events, onEdit, onRules, onTransition }: AdminEventListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <strong className="min-w-0 break-words">{event.name}</strong>
            <span className="flex flex-wrap justify-end gap-1.5">
              <EventStatusBadge status={event.status} />
              <RulesBadge event={event} />
            </span>
          </div>
          <EventSchedule event={event} />
          {event.description && (
            <p className="m-0 line-clamp-2 text-[13px] text-rs-muted">{event.description}</p>
          )}
          <EventActions
            event={event}
            mobile
            onEdit={onEdit}
            onRules={onRules}
            onTransition={onTransition}
          />
        </li>
      ))}
    </ul>
  )
}
