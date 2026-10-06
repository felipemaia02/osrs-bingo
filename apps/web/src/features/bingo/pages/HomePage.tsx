import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { BingoBoard } from '../components/BingoBoard'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import { useEventSelectionStore } from '../../events/store/eventSelectionStore'
import type { Tile } from '../data/tiles'

export function HomePage() {
  const { t } = useTranslation()
  const events = useEvents('active')
  const selectedEventId = useEventSelectionStore((state) => state.selectedEventId)
  const event =
    events.data?.find((candidate) => candidate.id === selectedEventId) ?? events.data?.[0] ?? null
  const board = usePublicBoard(event?.id ?? null)
  const tiles: Tile[] =
    board.data?.positions.map((position) => ({
      id: `${position.card.card_id}:${position.card.card_revision}`,
      row: position.row,
      col: position.column,
      name: position.card.name,
      tier: position.card.difficulty,
      points: position.card.tile_score,
      requirement: position.card.completion_requirement,
      progress: null,
      imageUrl: position.card.wiki_image?.image_url ?? null,
      imageSourceUrl: position.card.wiki_image?.file_page_url ?? null,
    })) ?? []

  return (
    <AppShell>
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rs-gold">
            {t('board.eyebrow')}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-rs-text sm:text-3xl">
                {t('board.title')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-rs-muted">
                {event
                  ? t('board.eventDescription', { event: event.name })
                  : t('board.description')}
              </p>
            </div>
          </div>
        </div>
        {(events.isLoading || board.isLoading) && (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        )}
        {(events.isError || board.isError) && <p role="alert">{t('common.apiError')}</p>}
        {!events.isLoading && !event && <p className="text-rs-muted">{t('board.noActiveEvent')}</p>}
        {event && !board.isLoading && !board.data && (
          <p className="text-rs-muted">{t('board.unavailable')}</p>
        )}
        {board.data && <BingoBoard tiles={tiles} showScore={false} />}
      </div>
    </AppShell>
  )
}
