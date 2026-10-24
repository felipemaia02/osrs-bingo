import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { PLAY_ENTRIES, isEntryActive, type NavEntry } from './navigation'

const ADMIN_TAB: NavEntry = {
  key: 'admin',
  labelKey: 'shell.adminTab',
  to: '/admin',
  icon: AdminPanelSettingsOutlined,
  activeIcon: AdminPanelSettings,
}

function BottomItem({ entry }: { entry: NavEntry }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const base = 'flex flex-col items-center justify-center gap-0.5 text-[11px]'
  if (!entry.to) {
    const Icon = entry.icon
    return (
      <span aria-disabled="true" className={`${base} text-rs-disabled`}>
        <Icon fontSize="small" aria-hidden="true" />
        {t('shell.submissionsSoon')}
      </span>
    )
  }
  const active = isEntryActive(entry, pathname)
  const Icon = active ? entry.activeIcon : entry.icon
  return (
    <Link
      to={entry.to}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${active ? 'font-semibold text-rs-gold-bright' : 'text-rs-muted'}`}
    >
      <Icon fontSize="small" aria-hidden="true" />
      {t(entry.labelKey)}
    </Link>
  )
}

/** Mobile bottom bar: Board, Events, My submissions and Admin for administrators. */
export function MobileBottomBar({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation()
  const play = PLAY_ENTRIES.filter((entry) => !entry.desktopOnly)
  const entries = isAdmin ? [...play, ADMIN_TAB] : play
  return (
    <nav
      aria-label={t('navigation.mobile')}
      className={`fixed inset-x-0 bottom-0 z-30 grid h-[68px] border-t border-rs-border bg-rs-inset md:hidden ${
        isAdmin ? 'grid-cols-4' : 'grid-cols-3'
      }`}
    >
      {entries.map((entry) => (
        <BottomItem key={entry.key} entry={entry} />
      ))}
    </nav>
  )
}
