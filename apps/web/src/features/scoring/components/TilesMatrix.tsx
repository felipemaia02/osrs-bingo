import { useTranslation } from 'react-i18next'
import { useAdminBoard } from '../../boards/hooks/useBoards'
import { useTeamScores } from '../hooks/useScoring'
import { progressShade, progressState } from '../progressShade'
import type { Ranking, TileProgressResponse } from '../types'
import { ProgressLegend } from './ProgressLegend'

const HEAD =
  'sticky top-0 z-10 border-b border-rs-border bg-rs-inset px-2 py-2 text-xs font-semibold'

/** Every tile by team: who completed what, and what nobody started (077 FR-006). */
export function TilesMatrix({ ranking }: { ranking: Ranking }) {
  const { t } = useTranslation()
  const board = useAdminBoard(ranking.event_id)
  const teams = ranking.teams
  const scores = useTeamScores(
    ranking.event_id,
    teams.map((team) => team.team_id),
  )
  if (board.isLoading || scores.some((score) => score.isLoading))
    return (
      <p role="status" className="m-0 text-sm text-rs-muted">
        {t('common.loading')}
      </p>
    )
  if (!board.data || !board.data.positions.length || scores.some((score) => !score.data))
    return (
      <p className="m-0 rounded border border-dashed border-rs-border px-3.5 py-3 text-[13px] text-rs-muted">
        {t('dashboard.matrixEmpty')}
      </p>
    )
  const progress = teams.map(
    (_, index) =>
      new Map<number, TileProgressResponse>(
        scores[index].data!.tiles.map((tile) => [tile.position, tile]),
      ),
  )
  const positions = [...board.data.positions].sort((a, b) => a.position - b.position)
  const doneBy = (position: number) => progress.filter((map) => map.get(position)?.complete).length
  const untouched = positions.filter((slot) =>
    progress.every((map) => (map.get(slot.position)?.progress ?? 0) === 0),
  )
  return (
    <section
      aria-labelledby="ranking-matrix"
      className="flex flex-col gap-3 rounded border border-rs-border bg-rs-surface p-3.5"
    >
      <div>
        <h2 id="ranking-matrix" className="m-0 font-display text-lg text-rs-gold-bright">
          {t('dashboard.matrixTitle')}
        </h2>
        <span className="text-xs text-rs-muted">{t('dashboard.matrixHint')}</span>
      </div>
      {untouched.length > 0 && (
        <p className="m-0 text-[13px]">
          <strong className="text-rs-gold">{t('dashboard.nobodyYet')}</strong>{' '}
          {untouched.map((slot) => slot.card.name).join(', ')}
        </p>
      )}
      <div className="max-h-[480px] overflow-auto rounded-[3px] border border-rs-border/60">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={`${HEAD} text-left`}>{t('dashboard.tile')}</th>
              {teams.map((team) => (
                <th key={team.team_id} className={`${HEAD} text-center`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full border border-rs-border-strong"
                      style={{ backgroundColor: team.team_color ?? undefined }}
                    />
                    {team.team_name}
                  </span>
                </th>
              ))}
              <th className={`${HEAD} text-right`}>{t('dashboard.doneBy')}</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((slot) => (
              <tr key={slot.position} className="border-b border-rs-border/30">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {slot.card.name}
                  {slot.bonus && <span className="ml-1 text-rs-gold">★</span>}
                </th>
                {teams.map((team, index) => {
                  const tile = progress[index].get(slot.position)
                  const value = tile?.progress ?? 0
                  const requirement = tile?.requirement ?? 0
                  const complete = tile?.complete ?? false
                  const state = progressState(value, complete)
                  const label = t(`dashboard.cell.${state}`, {
                    team: team.team_name,
                    value,
                    requirement,
                  })
                  return (
                    <td key={team.team_id} className="px-2 py-1.5 text-center">
                      <span
                        title={label}
                        className={`inline-flex h-6 min-w-12 items-center justify-center rounded-[3px] border px-1.5 text-[11px] tabular-nums ${progressShade(
                          value,
                          requirement,
                          complete,
                        )}`}
                      >
                        <span aria-hidden="true">
                          {state === 'complete'
                            ? '✓'
                            : state === 'partial'
                              ? `${value}/${requirement}`
                              : ''}
                        </span>
                        <span className="sr-only">{label}</span>
                      </span>
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-right tabular-nums text-rs-muted">
                  {doneBy(slot.position)}/{teams.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ProgressLegend />
    </section>
  )
}
