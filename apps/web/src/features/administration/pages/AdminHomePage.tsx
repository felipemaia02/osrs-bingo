import type { ReactNode } from 'react'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { BOARD_SIZE, useAdminOverview, type AdminOverview } from '../hooks/useAdminOverview'

interface StatusItem {
  label: string
  tone: BadgeTone
}

interface Section {
  key: string
  to: string | null
  titleKey: string
  descriptionKey: string
  icon: ReactNode
  /** Desktop card badges. */
  badges: StatusItem[]
  /** Mobile row: secondary text and an optional highlighted badge. */
  mobileDetail: string | null
  mobileBadge: StatusItem | null
}

function useSections(overview: AdminOverview): Section[] {
  const { t } = useTranslation()
  const { events, registrations, cards, draftBoard, administrators } = overview
  const nonZero = (items: Array<StatusItem & { count: number }>) =>
    items.filter((item) => item.count > 0).map(({ label, tone }) => ({ label, tone }))
  const joined = (items: StatusItem[]) =>
    items.length ? items.map((item) => item.label).join(' · ') : null

  const eventBadges = events
    ? nonZero([
        {
          count: events.active,
          label: t('admin.overviewStatus.active', { count: events.active }),
          tone: 'success',
        },
        {
          count: events.draft,
          label: t('admin.overviewStatus.draft', { count: events.draft }),
          tone: 'neutral',
        },
        {
          count: events.finished,
          label: t('admin.overviewStatus.finished', { count: events.finished }),
          tone: 'neutral',
        },
      ])
    : []
  const pending = registrations?.pending
    ? {
        label: t('admin.overviewStatus.pending', { count: registrations.pending }),
        tone: 'gold' as const,
      }
    : null
  const unassigned = registrations?.unassigned
    ? {
        label: t('admin.overviewStatus.unassigned', { count: registrations.unassigned }),
        tone: 'neutral' as const,
      }
    : null
  const cardBadges = cards
    ? nonZero([
        {
          count: cards.active,
          label: t('admin.overviewStatus.cardsActive', { count: cards.active }),
          tone: 'neutral',
        },
        {
          count: cards.retired,
          label: t('admin.overviewStatus.retired', { count: cards.retired }),
          tone: 'neutral',
        },
      ])
    : []
  const boardBadge = draftBoard
    ? {
        label: `${draftBoard.eventName} · ${draftBoard.filled}/${BOARD_SIZE}`,
        tone: 'neutral' as const,
      }
    : null
  const adminBadge =
    administrators !== null
      ? {
          label: t('admin.overviewStatus.administrators', { count: administrators }),
          tone: 'neutral' as const,
        }
      : null
  const present = (...items: Array<StatusItem | null>) =>
    items.filter((item): item is StatusItem => item !== null)

  return [
    {
      key: 'events',
      to: '/admin/events',
      titleKey: 'admin.events',
      descriptionKey: 'admin.eventsDescription',
      icon: <EventNoteOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: eventBadges,
      mobileDetail: joined(eventBadges.slice(0, 2)),
      mobileBadge: null,
    },
    {
      key: 'teams',
      to: '/admin/teams',
      titleKey: 'admin.teams',
      descriptionKey: 'admin.teamsDescription',
      icon: <GroupsOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: present(pending, unassigned),
      mobileDetail: unassigned?.label ?? null,
      mobileBadge: pending,
    },
    {
      key: 'cards',
      to: '/admin/cards',
      titleKey: 'admin.cards',
      descriptionKey: 'admin.cardsDescription',
      icon: <StyleOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: cardBadges,
      mobileDetail: joined(cardBadges),
      mobileBadge: null,
    },
    {
      key: 'boards',
      to: '/admin/boards',
      titleKey: 'admin.boards',
      descriptionKey: 'admin.boardsDescription',
      icon: <ViewModuleOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: present(boardBadge),
      mobileDetail: boardBadge?.label ?? null,
      mobileBadge: null,
    },
    {
      key: 'administrators',
      to: '/admin/administrators',
      titleKey: 'admin.administrators',
      descriptionKey: 'admin.rolesDescription',
      icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: present(adminBadge),
      mobileDetail: null,
      mobileBadge: null,
    },
    {
      key: 'ranking',
      to: null,
      titleKey: 'admin.ranking',
      descriptionKey: 'admin.rankingDescription',
      icon: <LeaderboardOutlinedIcon sx={{ fontSize: 20 }} />,
      badges: [{ label: t('shell.soon'), tone: 'neutral' }],
      mobileDetail: null,
      mobileBadge: { label: t('shell.soon'), tone: 'neutral' },
    },
  ]
}

function OverviewCard({ section }: { section: Section }) {
  const { t } = useTranslation()
  const body = (
    <>
      <span className={section.to ? 'text-rs-gold' : 'text-rs-muted'} aria-hidden="true">
        {section.icon}
      </span>
      <h2
        className={`m-0 font-display text-lg ${section.to ? 'text-rs-gold-bright group-hover:underline' : 'text-rs-muted'}`}
      >
        {t(section.titleKey)}
      </h2>
      <span className="text-[13px] text-rs-muted">{t(section.descriptionKey)}</span>
      {section.badges.length > 0 && (
        <span className="mt-auto flex flex-wrap gap-1.5">
          {section.badges.map((badge) => (
            <Badge key={badge.label} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </span>
      )}
    </>
  )
  const base =
    'flex min-h-[150px] flex-col gap-2.5 rounded border bg-rs-surface p-[18px] text-rs-text no-underline'
  if (!section.to) {
    return (
      <div aria-disabled="true" className={`${base} border-dashed border-rs-border opacity-75`}>
        {body}
      </div>
    )
  }
  return (
    <Link
      to={section.to}
      className={`group ${base} border-rs-border transition-colors hover:border-rs-border-strong focus-visible:border-rs-border-strong`}
    >
      {body}
    </Link>
  )
}

function OverviewRow({ section, last }: { section: Section; last: boolean }) {
  const { t } = useTranslation()
  const border = last ? '' : 'border-b border-rs-border/45'
  const content = (
    <>
      <span className={section.to ? 'text-rs-gold' : 'text-rs-disabled'} aria-hidden="true">
        {section.icon}
      </span>
      <span className="flex-1">
        {t(section.titleKey)}
        {section.mobileDetail && (
          <span className="block text-xs text-rs-muted">{section.mobileDetail}</span>
        )}
      </span>
      {section.mobileBadge && (
        <Badge tone={section.mobileBadge.tone}>{section.mobileBadge.label}</Badge>
      )}
      {section.to && <ChevronRightOutlinedIcon className="text-rs-muted" aria-hidden="true" />}
    </>
  )
  const base = `flex min-h-14 items-center gap-3 pl-3.5 pr-3 no-underline ${border}`
  if (!section.to) {
    return (
      <span aria-disabled="true" className={`${base} text-rs-disabled`}>
        {content}
      </span>
    )
  }
  return (
    <Link to={section.to} className={`${base} text-rs-text`}>
      {content}
    </Link>
  )
}

/** Administration overview (layout v2, mockups shell-a-desktop / shell-a-mobile). */
export function AdminHomePage() {
  const { t } = useTranslation()
  const sections = useSections(useAdminOverview())

  return (
    <AppShell>
      <div className="flex flex-col gap-3 md:gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('admin.privateArea')}
          </span>
          <h1 className="m-0 font-display text-2xl font-bold leading-[1.15] text-rs-gold-bright md:text-[32px]">
            {t('admin.title')}
          </h1>
          <span className="hidden text-rs-muted md:block">{t('admin.description')}</span>
        </div>
        <div className="hidden grid-cols-3 gap-3.5 md:grid">
          {sections.map((section) => (
            <OverviewCard key={section.key} section={section} />
          ))}
        </div>
        <nav
          aria-label={t('admin.sections')}
          className="overflow-hidden rounded border border-rs-border bg-rs-surface md:hidden"
        >
          {sections.map((section, index) => (
            <OverviewRow key={section.key} section={section} last={index === sections.length - 1} />
          ))}
        </nav>
      </div>
    </AppShell>
  )
}
