import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import type { TeamBalance, TeamBalanceResponse } from '../types'
import { TeamEmblem } from './TeamEmblem'

const FULL_BAR = 100

/** Team totals versus the average EHB per team (feature 023, FR-001). */
export function TeamBalanceCards({
  balance,
  onSettings,
}: {
  balance: TeamBalanceResponse
  /** Admins open the boss KC settings (feature 039). */
  onSettings?: () => void
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  if (!balance.teams.length) return null
  const strongest = Math.max(...balance.teams.map((team) => team.ehb_total))
  return (
    <section aria-labelledby="team-balance-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2
          id="team-balance-title"
          className="m-0 font-display text-lg font-bold text-rs-gold-bright"
        >
          {t('teams.balance.title')}
        </h2>
        <span className="text-[13px] text-rs-muted">
          {t('teams.balance.description', { average: format.whole(balance.average_ehb) })}
        </span>
        {onSettings && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onSettings}>
            <TuneOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
            {t('balance.settings.open')}
          </Button>
        )}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:overflow-visible md:px-0">
        {balance.teams.map((team) => (
          <TeamCard key={team.team_id} team={team} strongest={strongest} />
        ))}
      </div>
    </section>
  )
}

function TeamCard({ team, strongest }: { team: TeamBalance; strongest: number }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const width = strongest > 0 ? Math.round((team.ehb_total / strongest) * FULL_BAR) : 0
  const versus = `${team.ehb_vs_average > 0 ? '+' : team.ehb_vs_average < 0 ? '−' : '±'}${Math.abs(team.ehb_vs_average)}%`
  const short = team.players_short > 0
  return (
    <article
      aria-label={team.name}
      className="flex min-w-[240px] snap-start flex-col gap-2 rounded border border-rs-border/70 bg-rs-surface px-3.5 py-3 shadow-rs-panel md:min-w-0"
    >
      <div className="flex items-center gap-2.5">
        <TeamEmblem team={team} size="lg" />
        <strong className="min-w-0 flex-1 truncate">{team.name}</strong>
        <span className="text-[13px] text-rs-muted">
          {t('teams.balance.players', { count: team.player_count })}
        </span>
      </div>
      <Metric label={t('teams.balance.ehb')} value={format.whole(team.ehb_total)} />
      <div
        aria-hidden="true"
        className="h-2 overflow-hidden rounded border border-rs-border/60 bg-rs-inset"
      >
        <span className="block h-full bg-rs-gold" style={{ width: `${width}%` }} />
      </div>
      <Metric label={t('teams.balance.bossKc')} value={format.whole(team.boss_kc_total)} />
      <Metric label={t('teams.balance.raidsKc')} value={format.whole(team.raids_kc_total ?? 0)} />
      <div className="flex items-center justify-between py-0.5 text-[13px]">
        <span className="text-rs-muted">{t('teams.roles.captain')}</span>
        {team.captain ? (
          <span className="flex items-center gap-1.5">
            {team.captain} <Badge tone="gold">{t('teams.roles.captain')}</Badge>
          </span>
        ) : (
          <span className="text-rs-muted">{t('teams.balance.noCaptain')}</span>
        )}
      </div>
      <Badge tone={team.balanced && !short ? 'success' : 'gold'} className="self-start">
        {team.balanced && !short ? (
          <BalanceOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        ) : (
          <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        )}
        {t('teams.balance.versus', { value: versus })}
        {short && ` · ${t('teams.balance.short', { count: team.players_short })}`}
      </Badge>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[13px] tabular-nums">
      <span>{label}</span>
      <strong className="text-rs-gold-bright">{value}</strong>
    </div>
  )
}
