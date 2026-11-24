import { useTranslation } from 'react-i18next'
import { CardImage } from '../../../components/ui/CardImage'
import { Panel } from '../../../components/ui/Panel'
import type { Tile } from '../../bingo/types'
import { EstimateText } from '../../scoring/components/EstimateText'
import { progressRatio } from '../../scoring/progressShade'
import { nextObjectives } from '../objectives'

const PERCENT = 100

/** "What do we do now?": the tiles closest to done, time left and who is on them. */
export function NextObjectives({ tiles }: { tiles: Tile[] }) {
  const { t } = useTranslation()
  const objectives = nextObjectives(tiles)
  return (
    <Panel as="section" aria-labelledby="team-objectives" className="flex flex-col gap-3 p-3.5">
      <div>
        <h2 id="team-objectives" className="m-0 font-display text-lg text-rs-gold-bright">
          {t('dashboard.objectivesTitle')}
        </h2>
        <span className="text-xs text-rs-muted">{t('dashboard.objectivesHint')}</span>
      </div>
      {objectives.length ? (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {objectives.map((tile) => {
            const progress = tile.progress!
            const percent = Math.round(progressRatio(progress.value, tile.requirement) * PERCENT)
            return (
              <li key={tile.id} className="flex items-center gap-3">
                <CardImage name={tile.name} imageUrl={tile.imageUrl} className="size-10 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <strong className="truncate">{tile.name}</strong>
                    <span className="shrink-0 tabular-nums text-rs-muted">
                      {progress.value} / {tile.requirement}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={t('dashboard.objectiveProgress', { name: tile.name })}
                    aria-valuemin={0}
                    aria-valuemax={PERCENT}
                    aria-valuenow={percent}
                    className="h-1.5 overflow-hidden rounded-full bg-rs-inset"
                  >
                    <div
                      className="h-full rounded-full bg-rs-gold"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="flex flex-wrap gap-x-3 text-xs text-rs-muted">
                    <span>{t('tile.points', { count: tile.points })}</span>
                    {progress.remaining && (
                      <span>
                        {t('dashboard.remaining')} <EstimateText estimate={progress.remaining} />
                      </span>
                    )}
                    {tile.workers && tile.workers.length > 0 && (
                      <span className="text-rs-gold">
                        {t('dashboard.workingOn', {
                          names: tile.workers.map((worker) => worker.name).join(', '),
                        })}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm text-rs-muted">{t('dashboard.noObjectives')}</p>
      )}
    </Panel>
  )
}
