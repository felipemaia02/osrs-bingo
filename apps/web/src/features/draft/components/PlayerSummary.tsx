import type { ReactElement } from 'react'
import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'
import { TierBadge } from '../../profiles/components/TierBadge'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { timezoneCity, useAccountsLine } from '../../teams/rosterFormat'
import type { Player } from '../../teams/types'

/** A short read of a player's stats, for hovering a team member on the draft board (076). */
function SummaryContent({ player }: { player: Player }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const accountsLine = useAccountsLine()
  const stats: Array<[string, string]> = [
    [t('draft.ehb'), format.hours(player.ehb_total ?? null)],
    [t('draft.bossKc'), format.whole(player.boss_kc_total ?? null)],
    [t('draft.totalLevel'), format.whole(player.account?.total_level ?? null)],
  ]
  return (
    <div className="flex w-56 flex-col gap-2 text-[12px] text-rs-text">
      <div className="flex items-center justify-between gap-2">
        <strong className="truncate text-[13px] text-rs-gold-bright">{player.display_name}</strong>
        {player.account_id && <TierBadge tier={player.tier} />}
      </div>
      <span className="text-rs-muted">{accountsLine(player)}</span>
      <dl className="m-0 grid grid-cols-3 gap-1 text-center">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[3px] border border-rs-border/60 bg-rs-inset py-1">
            <dt className="text-[10px] uppercase tracking-[.06em] text-rs-muted">{label}</dt>
            <dd className="m-0 font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <span className="text-rs-muted">
        {[
          timezoneCity(player.timezone),
          player.activity ? t(`join.activity.short.${player.activity}`) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      <span className="text-[11px] text-rs-gold">{t('draft.board.fullDetails')}</span>
    </div>
  )
}

/** Wraps a trigger so hovering or focusing it shows the player's summary. */
export function PlayerSummaryTooltip({
  player,
  children,
}: {
  player: Player
  children: ReactElement
}) {
  return (
    <Tooltip
      title={<SummaryContent player={player} />}
      placement="right"
      enterDelay={150}
      slotProps={{
        tooltip: {
          className:
            '!max-w-none !rounded !border !border-rs-border-strong !bg-rs-surface !p-3 !shadow-rs-panel',
        },
      }}
    >
      {children}
    </Tooltip>
  )
}
