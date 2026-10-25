import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '../../ui/Badge'
import { ADMIN_ENTRIES, PLAY_ENTRIES, isEntryActive, type NavEntry } from './navigation'

function SidebarItem({ entry, badge }: { entry: NavEntry; badge?: number | null }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const base = 'flex min-h-10 items-center gap-3 rounded-[3px] border px-3 text-sm'

  if (!entry.to) {
    const Icon = entry.icon
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-transparent text-rs-disabled`}
      >
        <Icon fontSize="small" aria-hidden="true" />
        {t(entry.labelKey)}
        <Badge tone="neutral" className="ml-auto">
          {t('shell.soon')}
        </Badge>
      </span>
    )
  }
  const active = isEntryActive(entry, pathname)
  const Icon = active ? entry.activeIcon : entry.icon
  return (
    <Link
      to={entry.to}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${
        active
          ? 'border-rs-border-strong bg-rs-raised font-semibold text-rs-gold-bright'
          : 'border-transparent text-rs-text hover:bg-rs-surface'
      }`}
    >
      <Icon fontSize="small" aria-hidden="true" />
      {t(entry.labelKey)}
      {badge ? (
        <Badge tone="gold" className="ml-auto">
          {badge}
        </Badge>
      ) : null}
    </Link>
  )
}

function GroupLabel({ children, icon }: { children: string; icon?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[.14em] text-rs-muted">
      {children}
      {icon && <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
    </div>
  )
}

interface ShellSidebarProps {
  isAdmin: boolean
  pendingRegistrations: number | null
  pendingReviews: number | null
}

/** Desktop sidebar (layout 4A): Play for everyone, Administration only for administrators. */
export function ShellSidebar({ isAdmin, pendingRegistrations, pendingReviews }: ShellSidebarProps) {
  const { t } = useTranslation()
  const badges: Record<string, number | null> = {
    teams: pendingRegistrations,
    review: pendingReviews,
  }
  return (
    <nav
      aria-label={t('navigation.primary')}
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-rs-border/55 px-3 py-4 md:flex"
    >
      <GroupLabel>{t('navigation.play')}</GroupLabel>
      {PLAY_ENTRIES.map((entry) => (
        <SidebarItem key={entry.key} entry={entry} />
      ))}
      {isAdmin && (
        <>
          <GroupLabel icon>{t('admin.title')}</GroupLabel>
          {ADMIN_ENTRIES.map((entry) => (
            <SidebarItem key={entry.key} entry={entry} badge={badges[entry.key]} />
          ))}
        </>
      )}
    </nav>
  )
}
