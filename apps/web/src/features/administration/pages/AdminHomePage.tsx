import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'

export function AdminHomePage() {
  const { t } = useTranslation()
  const sections = [
    {
      to: '/admin/events',
      title: 'admin.events',
      description: 'admin.eventsDescription',
      icon: <EventOutlinedIcon />,
    },
    {
      to: '/admin/teams',
      title: 'admin.teams',
      description: 'admin.teamsDescription',
      icon: <GroupsOutlinedIcon />,
    },
    {
      to: '/admin/administrators',
      title: 'admin.administrators',
      description: 'admin.rolesDescription',
      icon: <AdminPanelSettingsOutlinedIcon />,
    },
    {
      to: '/admin/ranking',
      title: 'admin.ranking',
      description: 'admin.rankingDescription',
      icon: <LeaderboardOutlinedIcon />,
    },
  ]
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[.16em] text-rs-gold">{t('admin.privateArea')}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-rs-text">{t('admin.title')}</h1>
        <p className="mt-2 text-sm text-rs-muted">{t('admin.description')}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="group block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rs-gold"
            >
              <Panel className="h-full p-5 transition-colors group-hover:border-rs-gold group-focus-visible:border-rs-gold">
                <span className="text-rs-gold" aria-hidden="true">
                  {section.icon}
                </span>
                <h2 className="mt-3 font-display text-lg text-rs-gold-bright group-hover:underline">
                  {t(section.title)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-rs-muted">
                  {t(section.description)}
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
