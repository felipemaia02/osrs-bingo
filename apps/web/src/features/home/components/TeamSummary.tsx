import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { TeamScore } from '../../scoring/types'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { usePointsFormat } from '../../team/hooks/usePointsFormat'
import type { TeamMember } from '../../team/types'
import { HomeSection } from './HomeSection'
import { BUTTON_LINK_CLASS } from './linkClasses'

/** The viewer's team at a glance: score, tiles and their own place and points (FR-004). */
export function TeamSummary({ score, me }: { score: TeamScore; me: TeamMember | null }) {
  const { t } = useTranslation()
  const points = usePointsFormat()
  return (
    <HomeSection id="home-team" title={t('homePage.team.title')}>
      <div className="flex items-center gap-3">
        <TeamEmblem team={{ name: score.team_name, color: score.team_color }} size="lg" />
        <strong className="min-w-0 flex-1 truncate text-lg text-rs-text">{score.team_name}</strong>
        <strong className="font-display text-[28px] leading-none text-rs-gold-bright">
          <span className="sr-only">{t('score.total')} </span>
          {score.total}
        </strong>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2 text-[13px]">
        <Fact
          label={t('homePage.team.tiles')}
          value={`${score.completed_tiles}/${score.tile_count}`}
        />
        {me && (
          <Fact
            label={t('homePage.team.myPlace')}
            value={`${t('ranking.place', { count: me.position, ordinal: true })}${
              me.tied ? ` ${t('ranking.tie')}` : ''
            }`}
          />
        )}
        {me && <Fact label={t('homePage.team.myPoints')} value={points(me.points)} />}
        {me && <Fact label={t('homePage.team.myDrops')} value={String(me.drop_count)} />}
      </dl>
      <Link to="/team" className={`${BUTTON_LINK_CLASS} self-start`}>
        <Diversity3OutlinedIcon fontSize="small" aria-hidden="true" />
        {t('homePage.team.open')}
      </Link>
    </HomeSection>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-[3px] border border-rs-border/60 bg-rs-inset px-2.5 py-1.5">
      <dt className="text-[11px] uppercase tracking-[.06em] text-rs-muted">{label}</dt>
      <dd className="m-0 text-base font-semibold tabular-nums text-rs-gold-bright">{value}</dd>
    </div>
  )
}
