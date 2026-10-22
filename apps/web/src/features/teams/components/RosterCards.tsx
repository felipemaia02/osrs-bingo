import type { Player, RosterGroup, Team } from '../types'
import { useRequestedFormat } from '../hooks/useRequestedFormat'
import { RowActions, StatusBadge, type RowHandlers } from './RosterRowParts'
import { TeamEmblem } from './TeamEmblem'

interface RosterCardsProps {
  players: Player[]
  group: RosterGroup
  teams: Team[]
  editable: boolean
  busy: boolean
  handlers: RowHandlers
}

/** Mobile registration cards (teams-a-mobile). No multi-select on mobile. */
export function RosterCards({ players, group, teams, editable, busy, handlers }: RosterCardsProps) {
  const requested = useRequestedFormat()
  return (
    <div className="flex flex-col gap-3">
      {players.map((player) => {
        const team = teams.find((candidate) => candidate.id === player.team_id)
        return (
          <div
            key={player.id}
            className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <strong>{player.display_name}</strong>
                <br />
                <span className="text-xs text-rs-muted">
                  {player.discord_username ?? '—'} · {requested(player)}
                </span>
                {group === 'assigned' && team && (
                  <span className="mt-1 flex items-center gap-1.5 text-xs">
                    <TeamEmblem team={team} size="sm" />
                    {team.name}
                  </span>
                )}
              </div>
              <StatusBadge player={player} />
            </div>
            {editable && (
              <RowActions player={player} group={group} busy={busy} mobile handlers={handlers} />
            )}
          </div>
        )
      })}
    </div>
  )
}
