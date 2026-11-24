import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useNow } from '../../../hooks/useNow'
import { useSession } from '../../auth/hooks/useSession'
import { OPEN_EVENT_STATUSES, recentlyFinished, sortOpenEvents } from '../../events/currentEvents'
import { useEvents } from '../../events/hooks/useEvents'
import { canJoin } from '../../events/rules'
import { JOINED_STATE } from '../../join/state'
import { useOwnTeamScore } from '../../scoring/hooks/useScoring'
import { useOwnSubmissions } from '../../submissions/hooks/useSubmissions'
import { useOwnTeamHome } from '../../team/hooks/useOwnTeamHome'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { FinishedEventPodium } from '../components/FinishedEventPodium'
import { ActiveEventStrip, NoOpenEvent } from '../components/ActiveEventStrip'
import { HomeRules } from '../components/HomeRules'
import { HowItWorks } from '../components/HowItWorks'
import { JoinBanner } from '../components/JoinBanner'
import { PlayerShortcuts } from '../components/PlayerShortcuts'
import { TeamSummary } from '../components/TeamSummary'

/** Welcome, draft and active events, own team, next steps and the rules (052, 068). */
export function HomePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const joined = (location.state as Record<string, string> | null)?.[JOINED_STATE]
  const session = useSession()
  const user = session.data ?? null
  const events = useEvents(OPEN_EVENT_STATUSES)
  const finished = useEvents('finished')
  const now = useNow()
  const celebrated = recentlyFinished(finished.data ?? [], now)
  const openEvents = sortOpenEvents(events.data ?? [])
  const event = openEvents.find((candidate) => candidate.status === 'active') ?? null
  const joinable = openEvents.find(canJoin) ?? null
  const registration = useOwnRegistration(event?.id ?? '', event ? user?.id : undefined)
  const own = registration.data
  const registered = own?.status === 'pending' || own?.status === 'approved'
  const onTeam = own?.status === 'approved' && Boolean(own.team_id)
  const score = useOwnTeamScore(event?.id ?? null, onTeam)
  const team = useOwnTeamHome(event?.id ?? null, onTeam)
  const submissions = useOwnSubmissions(event && registered ? event.id : null)
  const me = team.data?.members.find((member) => member.player_id === own?.id) ?? null
  const loading = session.isLoading || events.isLoading
  const rulesEvent = event ?? openEvents[0] ?? null

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('homePage.eyebrow')}
          </span>
          <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {user ? t('homePage.welcomeBack', { name: user.username }) : t('homePage.welcome')}
          </h1>
          <span className="text-[13px] text-rs-muted md:text-sm">{t('homePage.tagline')}</span>
        </div>
        {joined && <InfoBanner>{t('join.sent', { name: joined })}</InfoBanner>}
        {loading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : (
          <>
            {celebrated && <FinishedEventPodium event={celebrated} />}
            {event && <ActiveEventStrip event={event} />}
            {joinable && <JoinBanner event={joinable} />}
            {!event && !joinable && !celebrated && <NoOpenEvent />}
            <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
              {score.data && <TeamSummary score={score.data} me={me} />}
              {registered && (
                <PlayerShortcuts counts={submissions.data?.counts ?? null} canSubmit={onTeam} />
              )}
              <div className="lg:col-span-2">
                <HomeRules event={rulesEvent} />
              </div>
              {!onTeam && (
                <div className="lg:col-span-2">
                  <HowItWorks loggedIn={Boolean(user)} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
