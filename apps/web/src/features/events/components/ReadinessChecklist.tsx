import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { useEventReadiness } from '../hooks/useEvents'
import type { BingoEvent, ReadinessKey } from '../types'

/** Where each missing item is fixed; the rules are edited from the event's Rules action. */
function fixLink(key: ReadinessKey, eventId: string): string | null {
  if (key === 'board' || key === 'line_bonuses')
    return `/admin/boards?event=${encodeURIComponent(eventId)}`
  if (key === 'rules') return null
  return '/admin/teams'
}

/** "x of N done" preparation checklist of a draft event (feature 073). */
export function ReadinessChecklist({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const readiness = useEventReadiness(event.status === 'draft' ? event.id : null)
  if (event.status !== 'draft' || !readiness.data) return null
  const { items } = readiness.data
  const done = items.filter((item) => item.done).length
  return (
    <details className="group rounded-[3px] border border-rs-border/60 bg-rs-inset text-left text-[13px]">
      <summary className="flex min-h-9 cursor-pointer items-center justify-between gap-2 px-2.5 font-semibold">
        <span>{t('events.readiness.title')}</span>
        <span className={done === items.length ? 'text-rs-success-text' : 'text-rs-gold-bright'}>
          {t('events.readiness.count', { done, total: items.length })}
        </span>
      </summary>
      <ul
        aria-label={t('events.readiness.listLabel', { name: event.name })}
        className="m-0 flex list-none flex-col gap-1 border-t border-rs-border/45 p-2.5"
      >
        {items.map((item) => {
          const link = item.done ? null : fixLink(item.key, event.id)
          return (
            <li key={item.key} className="flex flex-wrap items-center gap-2">
              {item.done ? (
                <CheckCircleIcon
                  sx={{ fontSize: 16 }}
                  className="text-rs-success"
                  aria-hidden="true"
                />
              ) : (
                <RadioButtonUncheckedIcon
                  sx={{ fontSize: 16 }}
                  className="text-rs-muted"
                  aria-hidden="true"
                />
              )}
              <span className={item.done ? 'text-rs-muted' : ''}>
                {t(`events.readiness.items.${item.key}`)}
                <span className="sr-only">
                  {' · '}
                  {t(item.done ? 'events.readiness.done' : 'events.readiness.missing')}
                </span>
              </span>
              {item.required && !item.done && (
                <Badge tone="danger">{t('events.readiness.required')}</Badge>
              )}
              {link && (
                <Link to={link} className="text-rs-gold-bright underline underline-offset-2">
                  {t('events.readiness.fix')}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
