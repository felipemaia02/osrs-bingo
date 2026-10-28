import HowToReg from '@mui/icons-material/HowToReg'
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Pending from '@mui/icons-material/Pending'
import PendingOutlined from '@mui/icons-material/PendingOutlined'
import PersonOff from '@mui/icons-material/PersonOff'
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined'
import Shield from '@mui/icons-material/Shield'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import { useTranslation } from 'react-i18next'
import type { EventStatus } from '../../events/types'
import type { RosterGroup } from '../types'

export type RosterTab = RosterGroup | 'teams'

const TABS: Array<{ value: RosterTab; icon: typeof Pending; activeIcon: typeof Pending }> = [
  { value: 'pending', icon: PendingOutlined, activeIcon: Pending },
  { value: 'unassigned', icon: PersonOffOutlined, activeIcon: PersonOff },
  { value: 'assigned', icon: HowToRegOutlined, activeIcon: HowToReg },
  { value: 'teams', icon: ShieldOutlined, activeIcon: Shield },
]

interface RosterTabsProps {
  tab: RosterTab
  counts: Record<RosterTab, number | null>
  eventStatus: EventStatus
  onChange: (tab: RosterTab) => void
  mobile: boolean
}

/** Status tabs with event-wide counts (teams-a-desktop tabs, teams-a-mobile chips). */
export function RosterTabs({ tab, counts, eventStatus, onChange, mobile }: RosterTabsProps) {
  const { t } = useTranslation()
  const label = (value: RosterTab) => t(`teams.roster.${value}`)

  if (mobile) {
    return (
      <div
        role="tablist"
        aria-label={t('teams.roster.tabs')}
        className="flex gap-1.5 overflow-x-auto pb-0.5"
      >
        {TABS.map(({ value }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`roster-tab-${value}`}
            aria-controls="roster-panel"
            aria-selected={tab === value}
            onClick={() => onChange(value)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
              tab === value
                ? 'border-rs-gold bg-rs-gold font-semibold text-rs-canvas'
                : 'border-rs-border bg-rs-inset text-rs-text'
            }`}
          >
            {label(value)} {counts[value] ?? ''}
          </button>
        ))}
      </div>
    )
  }
  const editable = eventStatus === 'draft'
  const live = eventStatus === 'active'
  return (
    <div className="flex border-b border-rs-border px-2">
      <div role="tablist" aria-label={t('teams.roster.tabs')} className="flex">
        {TABS.map(({ value, icon, activeIcon }) => {
          const active = tab === value
          const Icon = active ? activeIcon : icon
          return (
            <button
              key={value}
              type="button"
              role="tab"
              id={`roster-tab-${value}`}
              aria-controls="roster-panel"
              aria-selected={active}
              onClick={() => onChange(value)}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm ${
                active
                  ? 'border-rs-gold font-semibold text-rs-gold-bright'
                  : 'border-transparent text-rs-muted'
              }`}
            >
              <Icon sx={{ fontSize: 18 }} aria-hidden="true" />
              {label(value)}
              {counts[value] !== null && ' '}
              {counts[value] !== null && (
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
      <span className="ml-auto flex items-center gap-1.5 self-center text-xs text-rs-muted">
        {editable ? (
          <LockOpenOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        ) : (
          <LockOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        )}
        {editable
          ? t('teams.roster.editable')
          : live
            ? t('teams.roster.live')
            : t('teams.roster.readOnly', { status: t(`events.status.${eventStatus}`) })}
      </span>
    </div>
  )
}
