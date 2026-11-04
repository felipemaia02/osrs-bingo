import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { PLAY_ENTRIES, REVIEW_ENTRY, isEntryActive, type NavEntry } from './navigation'

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

/** Mobile bottom bar: Board, Events, My team, My submissions, plus Admin for administrators
 * or Review for captains and reviewers (064). */
export function MobileBottomBar({
  isAdmin,
  isReviewer,
}: {
  isAdmin: boolean
  isReviewer: boolean
}) {
  const { t } = useTranslation()
  const play = PLAY_ENTRIES.filter((entry) => !entry.desktopOnly)
  const extra = isAdmin ? ADMIN_TAB : isReviewer ? REVIEW_ENTRY : null
  const entries = extra ? [...play, extra] : play
  return (
    <nav
      aria-label={t('navigation.mobile')}
      className={`fixed inset-x-0 bottom-0 z-30 grid h-[68px] border-t border-rs-border bg-rs-inset md:hidden ${
        extra ? 'grid-cols-5' : 'grid-cols-4'
      }`}
    >
      {entries.map((entry) => (
        <BottomItem key={entry.key} entry={entry} />
      ))}
    </nav>
  )
}
