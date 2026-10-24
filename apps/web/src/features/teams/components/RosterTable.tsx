import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player, RosterGroup, Team } from '../types'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { timezoneCity, useAccountsLine } from '../rosterFormat'
import { useRequestedFormat } from '../hooks/useRequestedFormat'
import { BuyInBadge, RoleBadge, RowActions, type RowHandlers } from './RosterRowParts'
import { TeamEmblem } from './TeamEmblem'

interface RosterTableProps {
  players: Player[]
  group: RosterGroup
  teams: Team[]
  editable: boolean
  /** Events without a buy-in hide the Buy-in column. */
  showBuyIn: boolean
  busy: boolean
  selected: Set<string>
  onToggle: (player: Player) => void
  onToggleAll: () => void
  handlers: RowHandlers
}

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle text-[13px]'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

/** Desktop registration table with selection (teams-a-desktop). */
export function RosterTable({
  players,
  group,
  teams,
  editable,
  showBuyIn,
  busy,
  selected,
  onToggle,
  onToggleAll,
  handlers,
}: RosterTableProps) {
  const { t } = useTranslation()
  const requested = useRequestedFormat()
  const accountsLine = useAccountsLine()
  const format = useStatFormat()
  const allSelected = players.length > 0 && players.every((player) => selected.has(player.id))
  const someSelected = !allSelected && players.some((player) => selected.has(player.id))
  const headerBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someSelected
  }, [someSelected])

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {editable && (
            <th className={`${HEAD} w-11`}>
              <input
                ref={headerBox}
                type="checkbox"
                aria-label={t('teams.bulk.selectAll')}
                checked={allSelected}
                onChange={onToggleAll}
                className="size-[18px] accent-rs-gold"
              />
            </th>
          )}
          <th className={HEAD}>{t('teams.roster.player')}</th>
          {group === 'assigned' && <th className={HEAD}>{t('teams.roster.team')}</th>}
          {group === 'pending' && <th className={HEAD}>{t('teams.roster.requested')}</th>}
          <th className={HEAD}>{t('teams.roster.timezone')}</th>
          <th className={HEAD}>{t('teams.roster.activity')}</th>
          <th className={`${HEAD} text-right`}>{t('teams.roster.bossKc')}</th>
          <th className={`${HEAD} text-right`}>{t('teams.roster.ehb')}</th>
          <th className={HEAD}>{t('teams.roster.teammates')}</th>
          <th className={HEAD}>{t('teams.roster.role')}</th>
          {showBuyIn && <th className={HEAD}>{t('teams.roster.buyIn')}</th>}
          {editable && <th className={`${HEAD} text-right`}>{t('teams.roster.actions')}</th>}
        </tr>
      </thead>
      <tbody>
        {players.map((player) => {
          const isSelected = selected.has(player.id)
          const team = teams.find((candidate) => candidate.id === player.team_id)
          return (
            <tr key={player.id} className={isSelected ? 'bg-rs-raised' : ''}>
              {editable && (
                <td className={CELL}>
                  <input
                    type="checkbox"
                    aria-label={t('teams.bulk.select', { name: player.display_name })}
                    checked={isSelected}
                    onChange={() => onToggle(player)}
                    className="size-[18px] accent-rs-gold"
                  />
                </td>
              )}
              <td className={CELL}>
                <strong>{player.display_name}</strong>
                <br />
                <span className="text-xs text-rs-muted">{accountsLine(player)}</span>
              </td>
              {group === 'assigned' && (
                <td className={CELL}>
                  {team ? (
                    <span className="inline-flex items-center gap-2">
                      <TeamEmblem team={team} size="md" />
                      {team.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              )}
              {group === 'pending' && <td className={CELL}>{requested(player)}</td>}
              <td className={CELL} title={player.timezone ?? undefined}>
                {timezoneCity(player.timezone)}
              </td>
              <td className={`${CELL} whitespace-nowrap`}>
                {player.activity ? t(`join.activity.short.${player.activity}`) : '—'}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {format.whole(player.boss_kc_total ?? null)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                <strong>{format.hours(player.ehb_total ?? null)}</strong>
              </td>
              <td className={CELL}>
                {player.teammates?.length ? (
                  player.teammates.join(', ')
                ) : (
                  <span className="text-rs-muted">—</span>
                )}
              </td>
              <td className={CELL}>
                <RoleBadge player={player} />
              </td>
              {showBuyIn && (
                <td className={CELL}>
                  <BuyInBadge player={player} />
                </td>
              )}
              {editable && (
                <td className={`${CELL} text-right`}>
                  <RowActions
                    player={player}
                    group={group}
                    busy={busy}
                    mobile={false}
                    handlers={handlers}
                  />
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
