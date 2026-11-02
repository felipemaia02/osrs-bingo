import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { useSession } from '../../auth/hooks/useSession'
import { useEvents } from '../../events/hooks/useEvents'
import { useOwnTeamScore } from '../../scoring/hooks/useScoring'
import { useOwnSubmissions } from '../../submissions/hooks/useSubmissions'
import { useOwnTeamHome } from '../../team/hooks/useOwnTeamHome'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { ActiveEventCard, NoActiveEvent } from '../components/ActiveEventCard'
import { HowItWorks } from '../components/HowItWorks'
import { PlayerShortcuts } from '../components/PlayerShortcuts'
import { TeamSummary } from '../components/TeamSummary'

/** Welcome, active event, own team, next steps and how the bingo works (feature 052). */
export function HomePage() {
  const { t } = useTranslation()
  const session = useSession()
  const user = session.data ?? null
  const events = useEvents('active')
  const event = events.data?.find((candidate) => candidate.status === 'active') ?? null
  const registration = useOwnRegistration(event?.id ?? '', event ? user?.id : undefined)
  const own = registration.data
  const registered = own?.status === 'pending' || own?.status === 'approved'
  const onTeam = own?.status === 'approved' && Boolean(own.team_id)
  const score = useOwnTeamScore(event?.id ?? null, onTeam)
  const team = useOwnTeamHome(event?.id ?? null, onTeam)
  const submissions = useOwnSubmissions(event && registered ? event.id : null)
  const me = team.data?.members.find((member) => member.player_id === own?.id) ?? null
  const loading = session.isLoading || events.isLoading

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
        {loading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : (
          <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
            {event ? <ActiveEventCard event={event} loggedIn={Boolean(user)} /> : <NoActiveEvent />}
            {score.data && <TeamSummary score={score.data} me={me} />}
            {registered && (
              <PlayerShortcuts counts={submissions.data?.counts ?? null} canSubmit={onTeam} />
            )}
            {!onTeam && (
              <div className="lg:col-span-2">
                <HowItWorks loggedIn={Boolean(user)} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
