import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useTranslation } from 'react-i18next'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import type { Player } from '../../teams/types'
import type { DraftColumn } from '../board'

/** One team: colour, name, picks, captain, totals and members in pick order (076 FR-005). */
export function DraftTeamColumn({
  column,
  onClock,
  canReturn,
  onReturn,
  onEdit,
}: {
  column: DraftColumn
  onClock: boolean
  /** Whether × can send this member back to the pool (never captains; 037 during the event). */
  canReturn: (playerId: string) => boolean
  onReturn: (playerId: string) => void
  /** Role, buy-in and tier of a member; null when read-only. */
  onEdit: ((player: Player) => void) | null
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const { team } = column
  const id = `draft-team-${team.team_id}`
  return (
    <section
      aria-labelledby={id}
      aria-current={onClock ? 'true' : undefined}
      className={`flex min-w-[240px] flex-1 flex-col rounded border ${
        onClock ? 'border-rs-gold bg-rs-raised' : 'border-rs-border bg-rs-surface'
      }`}
    >
      <header className="flex flex-col gap-1 border-b border-rs-border/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id={id} className="m-0 flex min-w-0 items-center gap-2 text-base text-rs-text">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full border border-rs-border-strong"
              style={team.color ? { backgroundColor: team.color } : undefined}
            />
            <span className="truncate">{team.team_name}</span>
          </h3>
          <span className="whitespace-nowrap text-xs font-semibold text-rs-gold">
            {t('draft.board.picks', { count: column.picks })}
          </span>
        </div>
        <span className="text-xs text-rs-muted">
          {team.captain ? t('draft.board.captain', { name: team.captain }) : t('draft.noCaptain')}
        </span>
        <span className="text-xs text-rs-muted">
          {t('draft.ehb')} <strong className="text-rs-text">{format.hours(column.ehbTotal)}</strong>
          {' · '}
          {t('draft.bossKc')}{' '}
          <strong className="text-rs-text">{format.whole(column.bossKcTotal)}</strong>
        </span>
        {onClock && (
          <span className="mt-1 rounded-[3px] border border-rs-gold bg-rs-warning-bg py-0.5 text-center text-[11px] font-semibold uppercase tracking-[.14em] text-rs-gold-bright">
            {t('draft.board.onTheClockBadge')}
          </span>
        )}
      </header>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-2">
        {column.members.map((member, index) => (
          <li
            key={member.player.id}
            className={`flex min-h-10 items-center gap-2 rounded-[3px] border px-2.5 text-sm ${
              member.picked ? 'border-rs-gold/60 bg-rs-inset' : 'border-rs-border/60 bg-rs-inset'
            }`}
          >
            <span className="w-6 text-xs tabular-nums text-rs-muted">#{index + 1}</span>
            <strong className="min-w-0 flex-1 truncate">{member.player.display_name}</strong>
            {member.captain && (
              <span
                title={t('teams.roles.captain')}
                className="rounded-[2px] border border-rs-gold px-1 text-[10px] font-semibold text-rs-gold"
              >
                C<span className="sr-only"> · {t('teams.roles.captain')}</span>
              </span>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(member.player)}
                aria-label={t('teams.participant.edit', { name: member.player.display_name })}
                className="inline-flex size-8 items-center justify-center rounded-[3px] text-rs-muted hover:bg-rs-raised hover:text-rs-text"
              >
                <EditOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
              </button>
            )}
            {!member.captain && canReturn(member.player.id) && (
              <button
                type="button"
                onClick={() => onReturn(member.player.id)}
                aria-label={t('draft.board.remove', { name: member.player.display_name })}
                className="inline-flex size-8 items-center justify-center rounded-[3px] text-rs-muted hover:bg-rs-raised hover:text-rs-text"
              >
                <CloseOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {!column.members.length && (
          <li className="p-2 text-center text-xs text-rs-muted">{t('draft.pick.empty')}</li>
        )}
      </ol>
    </section>
  )
}
