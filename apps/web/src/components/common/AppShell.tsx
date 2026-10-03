import type { ReactNode } from 'react'
import GridViewIcon from '@mui/icons-material/GridView'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { AdminNavigation } from '../../features/administration/components/AdminNavigation'
import { useSession } from '../../features/auth/hooks/useSession'
import { AuthControls } from '../../features/auth/components/AuthControls'
import { EventSelector } from '../../features/events/components/EventSelector'
import { LanguageSwitcher } from './LanguageSwitcher'

interface AppShellProps {
  children: ReactNode
}

interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  compact?: boolean
  to?: string
}

function NavItem({
  icon,
  label,
  active = false,
  disabled = false,
  compact = false,
  to,
}: NavItemProps) {
  const className = `flex items-center rounded-sm border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    compact
      ? 'min-w-16 flex-col justify-center gap-1 border-transparent px-2 py-1.5 text-[10px]'
      : 'w-full gap-3 px-3 py-2.5 text-sm'
  } ${
    active
      ? 'border-rs-border-strong/70 bg-rs-gold/10 text-rs-gold-bright'
      : 'border-transparent text-rs-muted hover:bg-rs-raised hover:text-rs-text'
  }`
  const content = (
    <>
      {icon}
      <span className="font-medium">{label}</span>
    </>
  )
  if (to && !disabled) {
    return (
      <Link to={to} aria-current={active ? 'page' : undefined} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      disabled
      aria-current={active ? 'page' : undefined}
      title={disabled ? label : undefined}
      className={className}
    >
      {content}
    </button>
  )
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const session = useSession()
  const inAdministration = pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-rs-canvas text-rs-text">
      <header className="sticky top-0 z-30 border-b border-rs-border/60 bg-rs-surface/95 backdrop-blur">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:py-0 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-rs-border-strong bg-rs-inset text-rs-gold">
              <ShieldOutlinedIcon fontSize="small" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold tracking-[0.08em] text-rs-gold-bright sm:text-base">
                THUNDER CRABS
              </p>
              <p className="truncate text-xs text-rs-muted">{t('event.name')}</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <EventSelector />
            <LanguageSwitcher />
            <AuthControls />
          </div>
        </div>
      </header>

      <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-rs-border/50 bg-rs-surface px-3 py-5 md:block">
          <nav aria-label={t('navigation.primary')} className="space-y-1">
            <NavItem
              icon={<GridViewIcon fontSize="small" />}
              label={t('navigation.board')}
              active={pathname === '/'}
              to="/"
            />
            <NavItem
              icon={<EventOutlinedIcon fontSize="small" />}
              label={t('navigation.events')}
              active={pathname === '/events'}
              to="/events"
            />
            {session.data?.is_admin && (
              <NavItem
                icon={<AdminPanelSettingsOutlinedIcon fontSize="small" />}
                label={t('admin.title')}
                active={inAdministration}
                to="/admin"
              />
            )}
            <NavItem
              icon={<Inventory2OutlinedIcon fontSize="small" />}
              label={t('navigation.submissions')}
              disabled
            />
            <NavItem
              icon={<MilitaryTechOutlinedIcon fontSize="small" />}
              label={t('navigation.ranking')}
              disabled
            />
          </nav>
          <p className="mt-5 border-t border-rs-border/40 px-3 pt-4 text-xs leading-relaxed text-rs-muted">
            {t('navigation.comingSoon')}
          </p>
        </aside>

        <main className="min-w-0 px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8">
          {inAdministration && session.data?.is_admin && <AdminNavigation />}
          {children}
        </main>
      </div>

      <nav
        aria-label={t('navigation.mobile')}
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-rs-border/60 bg-rs-surface/95 px-2 py-1 backdrop-blur md:hidden"
      >
        <NavItem
          icon={<GridViewIcon fontSize="small" />}
          label={t('navigation.board')}
          active={pathname === '/'}
          to="/"
          compact
        />
        <NavItem
          icon={<EventOutlinedIcon fontSize="small" />}
          label={t('navigation.events')}
          active={pathname === '/events'}
          to="/events"
          compact
        />
        {session.data?.is_admin && (
          <NavItem
            icon={<AdminPanelSettingsOutlinedIcon fontSize="small" />}
            label={t('admin.title')}
            active={inAdministration}
            to="/admin"
            compact
          />
        )}
        <NavItem
          icon={<MilitaryTechOutlinedIcon fontSize="small" />}
          label={t('navigation.ranking')}
          disabled
          compact
        />
      </nav>
    </div>
  )
}
