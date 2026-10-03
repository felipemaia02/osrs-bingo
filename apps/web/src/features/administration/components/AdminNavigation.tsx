import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function AdminNavigation() {
  const { t } = useTranslation()
  const links = [
    ['/admin', 'admin.overview'],
    ['/admin/events', 'admin.events'],
    ['/admin/teams', 'admin.teams'],
    ['/admin/administrators', 'admin.administrators'],
    ['/admin/ranking', 'admin.ranking'],
  ]
  return (
    <nav
      aria-label={t('admin.sections')}
      className="mb-6 flex flex-wrap gap-2 border-b border-rs-border/50 pb-4"
    >
      {links.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          className={({ isActive }) =>
            `rounded-sm border px-3 py-2 text-sm ${isActive ? 'border-rs-border-strong bg-rs-gold/10 text-rs-gold-bright' : 'border-rs-border/50 text-rs-muted hover:text-rs-text'}`
          }
        >
          {t(label)}
        </NavLink>
      ))}
    </nav>
  )
}
