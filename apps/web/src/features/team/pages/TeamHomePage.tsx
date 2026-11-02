import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useSession } from '../../auth/hooks/useSession'
import { useEvents } from '../../events/hooks/useEvents'
import { TeamScorePanel } from '../../scoring/components/TeamScorePanel'
import { useOwnTeamScore } from '../../scoring/hooks/useScoring'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { RecentDrops } from '../components/RecentDrops'
import { TeamLeaderboard } from '../components/TeamLeaderboard'
import { TeamSheet } from '../components/TeamSheet'
import { TEAM_HOME_REFRESH_MS, useOwnTeamHome } from '../hooks/useOwnTeamHome'

const LINK_CLASS = 'font-semibold text-rs-gold-bright'

/** The player's own team in the active event (feature 050). */
export function TeamHomePage() {
  const { t } = useTranslation()
  const session = useSession()
  const events = useEvents('active')
  const event = events.data?.find((candidate) => candidate.status === 'active') ?? null
  const registration = useOwnRegistration(event?.id ?? '', event ? session.data?.id : undefined)
  const own = registration.data
  const onTeam = own?.status === 'approved' && Boolean(own.team_id)
  const home = useOwnTeamHome(event?.id ?? null, onTeam)
  const score = useOwnTeamScore(event?.id ?? null, onTeam, TEAM_HOME_REFRESH_MS)

  const loading =
    session.isLoading ||
    events.isLoading ||
    (Boolean(event && session.data) && registration.isLoading)

  const blocker: ReactNode = !session.data ? (
    <>
      {t('teamHome.login')}{' '}
      <Link to="/login" className={LINK_CLASS}>
        {t('auth.login')}
      </Link>
    </>
  ) : !event ? (
    t('teamHome.notStarted')
  ) : own?.status === 'removed' ? (
    t('teamHome.removed')
  ) : !onTeam ? (
    <>
      {t('teamHome.noTeam')}{' '}
      <Link to="/events" className={LINK_CLASS}>
        {t('navigation.events')}
      </Link>
    </>
  ) : null

  const team = home.data
  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          {event && (
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
              {event.name}
            </span>
          )}
          <h1 className="m-0 flex items-center gap-2.5 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {team && (
              <TeamEmblem team={{ name: team.team_name, color: team.team_color }} size="lg" />
            )}
            {team?.team_name ?? t('teamHome.title')}
          </h1>
          <span className="text-[13px] text-rs-muted md:text-sm">{t('teamHome.description')}</span>
        </div>
        {loading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : blocker ? (
          <InfoBanner>{blocker}</InfoBanner>
        ) : home.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : home.isError || !team ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : (
          <>
            {score.data && <TeamScorePanel score={score.data} />}
            <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
              <TeamLeaderboard members={team.members} />
              <RecentDrops drops={team.recent_drops} />
            </div>
            <TeamSheet members={team.members} />
          </>
        )}
      </div>
    </AppShell>
  )
}
