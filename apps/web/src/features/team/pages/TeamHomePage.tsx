import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useSession } from '../../auth/hooks/useSession'
import { boardToTiles } from '../../bingo/boardTiles'
import { useTeamActivity } from '../../bingo/hooks/useTileActivity'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import { TeamScorePanel } from '../../scoring/components/TeamScorePanel'
import { useOwnTeamScore } from '../../scoring/hooks/useScoring'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { BoardHeatmap } from '../components/BoardHeatmap'
import { NextObjectives } from '../components/NextObjectives'
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
  // The board gives names, images and estimates; activity says who is on each tile (077).
  const board = usePublicBoard(onTeam ? (event?.id ?? null) : null)
  const activity = useTeamActivity(event?.id ?? null, onTeam)
  const tiles = useMemo(
    () =>
      board.data ? boardToTiles(board.data, score.data ?? null, { activity: activity.data }) : [],
    [board.data, score.data, activity.data],
  )
  const imageFor = (cardName: string) =>
    tiles.find((tile) => tile.name === cardName)?.imageUrl ?? null

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
      <Link to="/" className={LINK_CLASS}>
        {t('navigation.home')}
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
            {score.data && tiles.length > 0 && (
              <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <BoardHeatmap
                  tiles={tiles}
                  size={board.data?.size ?? Math.round(Math.sqrt(score.data.tile_count))}
                  completedRows={score.data.completed_rows}
                  completedColumns={score.data.completed_columns}
                />
                <NextObjectives tiles={tiles} />
              </div>
            )}
            <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
              <TeamLeaderboard members={team.members} />
              <RecentDrops drops={team.recent_drops} imageFor={imageFor} />
            </div>
            <TeamSheet members={team.members} />
          </>
        )}
      </div>
    </AppShell>
  )
}
