import { useTranslation } from 'react-i18next'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import type { Player } from '../types'
import { timezoneCity, useAccountsLine } from '../rosterFormat'
import { useRequestedFormat } from '../hooks/useRequestedFormat'
import {
  BuyInBadge,
  LateJoinBadge,
  RoleBadge,
  RowActions,
  StatusBadge,
  type RowHandlers,
} from './RosterRowParts'
import { TierWithSuggestion } from '../../profiles/components/TierBadge'

interface RosterCardsProps {
  /** Pending requests (076 revision 1). */
  players: Player[]
  editable: boolean
  busy: boolean
  handlers: RowHandlers
}

/** Mobile registration cards (teams-a-mobile). No multi-select on mobile. */
export function RosterCards({ players, editable, busy, handlers }: RosterCardsProps) {
  const { t } = useTranslation()
  const requested = useRequestedFormat()
  const accountsLine = useAccountsLine()
  const format = useStatFormat()
  return (
    <div className="flex flex-col gap-3">
      {players.map((player) => {
        return (
          <div
            key={player.id}
            className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <strong>{player.display_name}</strong> <LateJoinBadge player={player} />
                <br />
                <span className="text-xs text-rs-muted">
                  {accountsLine(player)}
                  {` · ${requested(player)}`}
                </span>
              </div>
              <StatusBadge player={player} />
            </div>
            {player.account_id && <TierWithSuggestion info={player} />}
            {player.ehb_total !== null && player.ehb_total !== undefined && (
              <span className="text-[13px] tabular-nums">
                {t('teams.roster.experienceLine', {
                  ehb: format.hours(player.ehb_total),
                  kc: format.whole(player.boss_kc_total ?? null),
                })}
              </span>
            )}
            <span className="text-xs text-rs-muted">
              {[
                player.timezone ? timezoneCity(player.timezone) : null,
                player.activity ? t(`join.activity.short.${player.activity}`) : null,
                player.teammates?.length
                  ? t('teams.roster.wantsWith', { names: player.teammates.join(', ') })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {(player.role || player.buy_in_status) && (
              <span className="flex flex-wrap items-center gap-2">
                {player.role && <RoleBadge player={player} />}
                <BuyInBadge player={player} />
              </span>
            )}
            {editable && <RowActions player={player} busy={busy} mobile handlers={handlers} />}
          </div>
        )
      })}
    </div>
  )
}
