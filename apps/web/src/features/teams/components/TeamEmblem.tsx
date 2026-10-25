import type { Team } from '../types'

const EMBLEM_LETTERS = 2

function emblemInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words.map((word) => word[0]).join('') : name)
    .slice(0, EMBLEM_LETTERS)
    .toUpperCase()
}

const SIZE_CLASS = {
  sm: 'size-5 text-[9px]',
  md: 'size-[22px] text-[10px]',
  lg: 'size-[34px] text-[13px]',
} as const

/** Team color with its initials (design: `tm-e`). */
export function TeamEmblem({
  team,
  size,
}: {
  team: Pick<Team, 'name' | 'color'>
  size: keyof typeof SIZE_CLASS
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] font-bold text-rs-text ${
        team.color ? '' : 'bg-rs-raised'
      } ${SIZE_CLASS[size]}`}
      style={team.color ? { backgroundColor: team.color } : undefined}
    >
      {emblemInitials(team.name)}
    </span>
  )
}
