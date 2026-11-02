import type { DragEvent } from 'react'
import type { DraftCaptain, DraftPreview, Player } from '../teams/types'

/** One team column of the pinned rosters (feature 049, FR-002). */
export interface TeamRoster {
  team: DraftCaptain
  members: Player[]
  ehbTotal: number
  bossKcTotal: number
}

const sum = (values: Array<number | null | undefined>) =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0)

/** Captains first, then members by EHB (highest first), like the available list. */
const rosterOrder = (a: Player, b: Player) =>
  Number(b.role === 'captain') - Number(a.role === 'captain') ||
  (b.ehb_total ?? -1) - (a.ehb_total ?? -1) ||
  a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })

/** Every team with its members and display totals (Σ of the members' profile totals). */
export function teamRosters(preview: DraftPreview): TeamRoster[] {
  return preview.captains.map((team) => {
    const members = preview.members
      .filter((member) => member.team_id === team.team_id)
      .sort(rosterOrder)
    return {
      team,
      members,
      ehbTotal: sum(members.map((member) => member.ehb_total)),
      bossKcTotal: sum(members.map((member) => member.boss_kc_total)),
    }
  })
}

/** Moves a player between "available" and a team (optimistic pick). */
export function moveInDraft(
  preview: DraftPreview,
  playerId: string,
  teamId: string | null,
): DraftPreview {
  const player = [...preview.players, ...preview.members].find((item) => item.id === playerId)
  if (!player) return preview
  const moved = { ...player, team_id: teamId }
  const players = preview.players.filter((item) => item.id !== playerId)
  const members = preview.members.filter((item) => item.id !== playerId)
  return teamId
    ? { ...preview, players, members: [...members, moved] }
    : { ...preview, players: [...players, moved], members }
}

/** Captains are moved on the Teams page, where their role is cleared (BR-003). */
export const canMove = (player: Player) => player.role !== 'captain'

/** Data type for a dragged player card. */
export const DRAG_TYPE = 'application/x-osrs-bingo-player'

/** The dragged player's id when the drag carries one of our cards. */
export function draggedPlayer(drag: DragEvent): string | null {
  return drag.dataTransfer.getData(DRAG_TYPE) || null
}

/** Drop targets accept only our player cards. */
export function acceptsPlayer(drag: DragEvent): boolean {
  return Array.from(drag.dataTransfer.types).includes(DRAG_TYPE)
}
