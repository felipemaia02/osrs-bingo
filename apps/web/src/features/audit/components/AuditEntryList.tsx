import { useState } from 'react'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { useSubmissionTime } from '../../submissions/hooks/useSubmissionTime'
import { groupOf, type AuditActor, type AuditEntry, type AuditGroup } from '../types'
import { AuditPayload } from './AuditPayload'

const GROUP_TONE: Record<AuditGroup, BadgeTone> = {
  event: 'gold',
  registration: 'info',
  team: 'info',
  board: 'gold',
  card: 'gold',
  submission: 'success',
  admin: 'danger',
  settings: 'neutral',
  profile: 'neutral',
  activity: 'neutral',
}

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-top'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

function ActorName({ actor }: { actor: AuditActor }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-col">
      <span className="font-semibold">{actor.name}</span>
      {actor.kind === 'bot' && (
        <span className="text-xs text-rs-muted">
          {actor.on_behalf_of
            ? t('audit.actor.botFor', { name: actor.on_behalf_of })
            : t('audit.actor.bot')}
        </span>
      )}
    </span>
  )
}

function ActionLabel({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  return (
    <Badge tone={GROUP_TONE[groupOf(entry.action)] ?? 'neutral'}>
      {t(`audit.actions.${entry.action}`, { defaultValue: entry.action })}
    </Badge>
  )
}

function When({ iso }: { iso: string }) {
  const time = useSubmissionTime()
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} className="whitespace-nowrap">
      {time.ago(iso)}
    </time>
  )
}

/** "Crabs" or, without a name, the resource kind. */
function What({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  return (
    <span className="break-words">
      {entry.resource.label ?? t(`audit.groups.${groupOf(entry.action)}`)}
    </span>
  )
}

function ToggleDetails({
  entry,
  open,
  onToggle,
}: {
  entry: AuditEntry
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const count = Object.keys(entry.payload).length
  if (!count) return null
  const Icon = open ? ExpandLessOutlinedIcon : ExpandMoreOutlinedIcon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex min-h-8 items-center gap-0.5 text-[13px] text-rs-gold-bright hover:underline"
    >
      <Icon sx={{ fontSize: 18 }} aria-hidden="true" />
      {t('audit.details', { count })}
    </button>
  )
}

function useOpenRows() {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return { isOpen: (id: string) => open.has(id), toggle }
}

interface AuditEntryListProps {
  entries: AuditEntry[]
  eventNames: Map<string, string>
}

/** Desktop table (FR-004). */
export function AuditTable({ entries, eventNames }: AuditEntryListProps) {
  const { t } = useTranslation()
  const rows = useOpenRows()
  return (
    <div className="overflow-x-auto rounded-[3px] border border-rs-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={HEAD}>{t('audit.columns.when')}</th>
            <th className={HEAD}>{t('audit.columns.actor')}</th>
            <th className={HEAD}>{t('audit.columns.action')}</th>
            <th className={HEAD}>{t('audit.columns.what')}</th>
            <th className={HEAD}>{t('audit.columns.event')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className={`${CELL} text-rs-muted`}>
                <When iso={entry.at} />
              </td>
              <td className={CELL}>
                <ActorName actor={entry.actor} />
              </td>
              <td className={CELL}>
                <ActionLabel entry={entry} />
              </td>
              <td className={`${CELL} min-w-[260px]`}>
                <div className="flex flex-col gap-1">
                  <What entry={entry} />
                  <ToggleDetails
                    entry={entry}
                    open={rows.isOpen(entry.id)}
                    onToggle={() => rows.toggle(entry.id)}
                  />
                  {rows.isOpen(entry.id) && <AuditPayload payload={entry.payload} />}
                </div>
              </td>
              <td className={`${CELL} text-rs-muted`}>
                {entry.event_id ? (eventNames.get(entry.event_id) ?? '—') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mobile cards (FR-004). */
export function AuditCards({ entries, eventNames }: AuditEntryListProps) {
  const rows = useOpenRows()
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-1.5 rounded-[3px] border border-rs-border bg-rs-surface p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <ActionLabel entry={entry} />
            <span className="text-xs text-rs-muted">
              <When iso={entry.at} />
            </span>
          </div>
          <What entry={entry} />
          <span className="flex flex-wrap items-baseline gap-x-2 text-xs text-rs-muted">
            <ActorName actor={entry.actor} />
            {entry.event_id && <span>{eventNames.get(entry.event_id)}</span>}
          </span>
          <ToggleDetails
            entry={entry}
            open={rows.isOpen(entry.id)}
            onToggle={() => rows.toggle(entry.id)}
          />
          {rows.isOpen(entry.id) && <AuditPayload payload={entry.payload} />}
        </li>
      ))}
    </ul>
  )
}
