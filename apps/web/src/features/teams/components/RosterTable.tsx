import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player, RosterGroup, Team } from '../types'
import { useRequestedFormat } from '../hooks/useRequestedFormat'
import { RowActions, StatusBadge, type RowHandlers } from './RosterRowParts'
import { TeamEmblem } from './TeamEmblem'

interface RosterTableProps {
  players: Player[]
  group: RosterGroup
  teams: Team[]
  editable: boolean
  busy: boolean
  selected: Set<string>
  onToggle: (player: Player) => void
  onToggleAll: () => void
  handlers: RowHandlers
}

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

/** Desktop registration table with selection (teams-a-desktop). */
export function RosterTable({
  players,
  group,
  teams,
  editable,
  busy,
  selected,
  onToggle,
  onToggleAll,
  handlers,
}: RosterTableProps) {
  const { t } = useTranslation()
  const requested = useRequestedFormat()
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
          <th className={HEAD}>{t('teams.roster.osrsName')}</th>
          <th className={HEAD}>{t('teams.roster.discord')}</th>
          {group === 'assigned' && <th className={HEAD}>{t('teams.roster.team')}</th>}
          <th className={HEAD}>{t('teams.roster.requested')}</th>
          <th className={HEAD}>{t('teams.roster.status')}</th>
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
              </td>
              <td className={`${CELL} text-rs-muted`}>{player.discord_username ?? '—'}</td>
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
              <td className={CELL}>{requested(player)}</td>
              <td className={CELL}>
                <StatusBadge player={player} />
              </td>
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
