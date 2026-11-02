import { useTranslation } from 'react-i18next'
import { Panel } from '../../../components/ui/Panel'
import { useSubmissionTime } from '../../submissions/hooks/useSubmissionTime'
import { usePointsFormat } from '../hooks/usePointsFormat'
import type { TeamDrop } from '../types'

/** The team's newest accepted drops: who got what and the points it gave them (FR-004). */
export function RecentDrops({ drops }: { drops: TeamDrop[] }) {
  const { t } = useTranslation()
  const { when } = useSubmissionTime()
  const points = usePointsFormat()
  return (
    <Panel as="section" aria-labelledby="team-recent-drops" className="flex flex-col gap-3 p-3.5">
      <h2 id="team-recent-drops" className="m-0 font-display text-lg text-rs-gold-bright">
        {t('teamHome.recentDrops')}
      </h2>
      {drops.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {drops.map((drop) => (
            <li
              key={drop.submission_id}
              className="flex items-start justify-between gap-3 border-b border-rs-border/45 py-2.5 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <strong className="text-[13px] text-rs-text">
                  {drop.drop_name ?? drop.card_name}
                  {drop.quantity > 1 && ` ×${drop.quantity}`}
                </strong>
                <span className="text-xs text-rs-muted">
                  {t('teamHome.dropLine', {
                    player: drop.player_name,
                    card: drop.card_name,
                    when: when(drop.accepted_at),
                  })}
                </span>
              </span>
              <strong className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-rs-gold-bright">
                {t('teamHome.dropPoints', { points: points(drop.points) })}
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-rs-muted">{t('teamHome.noDrops')}</p>
      )}
    </Panel>
  )
}
