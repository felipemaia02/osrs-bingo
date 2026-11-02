import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import type { DraftCaptain, Player } from '../../teams/types'
import { DRAG_TYPE, acceptsPlayer, canMove, draggedPlayer, type TeamRoster } from '../rosters'
import { TeamPicker } from './TeamPicker'

/** Pinned team rosters that fill up live during the pick (049, FR-002/FR-003). */
export function TeamRosters({
  rosters,
  teams,
  canDrag,
  busy,
  onPick,
}: {
  rosters: TeamRoster[]
  teams: DraftCaptain[]
  canDrag: boolean
  busy: boolean
  onPick: (playerId: string, teamId: string | null) => void
}) {
  const { t } = useTranslation()
  if (!rosters.length) return <p className="m-0 text-sm text-rs-muted">{t('draft.pick.noTeams')}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rosters.map((roster) => (
        <RosterColumn
          key={roster.team.team_id}
          roster={roster}
          teams={teams}
          canDrag={canDrag}
          busy={busy}
          onPick={onPick}
        />
      ))}
    </ul>
  )
}

function RosterColumn({
  roster,
  teams,
  canDrag,
  busy,
  onPick,
}: {
  roster: TeamRoster
  teams: DraftCaptain[]
  canDrag: boolean
  busy: boolean
  onPick: (playerId: string, teamId: string | null) => void
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const [over, setOver] = useState(false)
  const { team, members } = roster
  return (
    <li
      aria-label={team.team_name}
      onDragOver={(drag) => {
        if (!canDrag || !acceptsPlayer(drag)) return
        drag.preventDefault()
        drag.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(drag) => {
        setOver(false)
        const playerId = draggedPlayer(drag)
        if (!playerId) return
        drag.preventDefault()
        onPick(playerId, team.team_id)
      }}
      className={`flex flex-col gap-2 rounded border bg-rs-surface p-3 shadow-rs-panel ${
        over ? 'border-rs-gold-bright bg-rs-raised' : 'border-rs-border/70'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <TeamEmblem team={{ name: team.team_name, color: team.color }} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-rs-text">{team.team_name}</strong>
          <span className="text-xs text-rs-muted">
            {t('draft.pick.totals', {
              count: members.length,
              ehb: format.hours(roster.ehbTotal),
              kc: format.whole(roster.bossKcTotal),
            })}
          </span>
        </span>
      </div>
      {!team.captain && <span className="text-xs text-rs-muted">{t('draft.noCaptain')}</span>}
      {members.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {members.map((member) => (
            <RosterMember
              key={member.id}
              member={member}
              teams={teams}
              canDrag={canDrag}
              busy={busy}
              onPick={onPick}
            />
          ))}
        </ul>
      ) : (
        <span className="rounded-[3px] border border-dashed border-rs-border-strong/60 px-2 py-2 text-center text-xs text-rs-muted">
          {t(canDrag ? 'draft.pick.dropHere' : 'draft.pick.empty')}
        </span>
      )}
    </li>
  )
}

function RosterMember({
  member,
  teams,
  canDrag,
  busy,
  onPick,
}: {
  member: Player
  teams: DraftCaptain[]
  canDrag: boolean
  busy: boolean
  onPick: (playerId: string, teamId: string | null) => void
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const movable = canMove(member)
  return (
    <li
      draggable={canDrag && movable}
      onDragStart={(drag) => {
        drag.dataTransfer.setData(DRAG_TYPE, member.id)
        drag.dataTransfer.effectAllowed = 'move'
      }}
      className={`flex min-h-10 items-center gap-2 border-b border-rs-border/45 py-1 text-[13px] last:border-b-0 ${
        canDrag && movable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate">{member.display_name}</span>
        {member.role === 'captain' && <Badge tone="gold">{t('teams.roles.captain')}</Badge>}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-rs-muted">
        {format.hours(member.ehb_total ?? null)}
      </span>
      {movable && (
        <TeamPicker
          name={member.display_name}
          teamId={member.team_id}
          teams={teams}
          disabled={busy}
          onPick={(teamId) => onPick(member.id, teamId)}
        />
      )}
    </li>
  )
}
