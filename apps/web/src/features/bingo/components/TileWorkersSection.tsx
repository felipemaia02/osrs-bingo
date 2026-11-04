import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { useToggleWorking } from '../hooks/useTileActivity'
import type { Tile, TileWorker } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

function daysLeft(worker: TileWorker): number {
  return Math.max(1, Math.ceil((Date.parse(worker.expires_at) - Date.now()) / DAY_MS))
}

/** Who on the team works on the tile; read-only when `eventId` is null (admin view). */
export function TileWorkersSection({ tile, eventId }: { tile: Tile; eventId: string | null }) {
  const { t } = useTranslation()
  const toggle = useToggleWorking(eventId ?? '')
  const workers = tile.workers ?? []
  const you = workers.find((worker) => worker.is_you)

  return (
    <section
      aria-label={t('activity.title')}
      className="flex flex-col gap-1.5 rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5"
    >
      <strong className="text-[13px]">{t('activity.title')}</strong>
      {workers.length ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[13px]">
          {workers.map((worker) => (
            <li key={worker.player_id} className="flex justify-between gap-2">
              <span>{worker.is_you ? t('activity.you') : worker.name}</span>
              {worker.is_you && (
                <span className="text-xs text-rs-muted">
                  {t('activity.expires', { count: daysLeft(worker) })}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-[13px] text-rs-muted">{t('activity.nobody')}</span>
      )}
      {eventId && (
        <>
          {!you && tile.progress?.complete && (
            <span className="text-xs text-rs-muted">{t('activity.alreadyComplete')}</span>
          )}
          <span className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={you ? 'default' : 'primary'}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ position: tile.position, working: !you })}
            >
              {t(you ? 'activity.stop' : 'activity.start')}
            </Button>
            {you && (
              <Button
                size="sm"
                variant="ghost"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ position: tile.position, working: true })}
              >
                {t('activity.renew')}
              </Button>
            )}
          </span>
          {toggle.isError && (
            <span role="alert" className="text-xs text-rs-danger-text">
              {t('common.apiError')}
            </span>
          )}
        </>
      )}
    </section>
  )
}
