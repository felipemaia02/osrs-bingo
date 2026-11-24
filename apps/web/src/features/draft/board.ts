import type { DraftCaptain, DraftPreview, Player } from '../teams/types'
import type { DraftSession } from './session'

export interface DraftMember {
  player: Player
  captain: boolean
  /** Picked in this session (not saved yet). */
  picked: boolean
}

export interface DraftColumn {
  team: DraftCaptain
  members: DraftMember[]
  picks: number
  ehbTotal: number
  bossKcTotal: number
}

const sum = (values: Array<number | null | undefined>) =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0)

/** One column per team in draft order: captain, members from before, then this session's
 * picks by pick number (FR-005). */
export function draftColumns(preview: DraftPreview, session: DraftSession): DraftColumn[] {
  const everyone = new Map(
    [...preview.players, ...preview.members].map((player) => [player.id, player]),
  )
  const teams = new Map(preview.captains.map((team) => [team.team_id, team]))
  const picked = new Set(session.picks.map((pick) => pick.playerId))
  return session.order.flatMap((teamId) => {
    const team = teams.get(teamId)
    if (!team) return []
    const before = preview.members
      .filter(
        (member) =>
          member.team_id === teamId &&
          !session.released.includes(member.id) &&
          !picked.has(member.id),
      )
      .sort((a, b) => Number(b.role === 'captain') - Number(a.role === 'captain'))
      .map((player) => ({ player, captain: player.role === 'captain', picked: false }))
    const picks = session.picks
      .filter((pick) => pick.teamId === teamId)
      .sort((a, b) => a.slot - b.slot)
      .flatMap((pick) => {
        const player = everyone.get(pick.playerId)
        return player ? [{ player, captain: false, picked: true }] : []
      })
    const members = [...before, ...picks]
    return [
      {
        team,
        members,
        picks: picks.length,
        ehbTotal: sum(members.map((member) => member.player.ehb_total)),
        bossKcTotal: sum(members.map((member) => member.player.boss_kc_total)),
      },
    ]
  })
}

/** Approved players without a team, plus members sent back, minus this session's picks. */
export function draftPool(preview: DraftPreview, session: DraftSession): Player[] {
  const picked = new Set(session.picks.map((pick) => pick.playerId))
  const released = preview.members.filter((member) => session.released.includes(member.id))
  return [...preview.players, ...released].filter((player) => !picked.has(player.id))
}
