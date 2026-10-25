import type { ReactNode } from 'react'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { Panel } from '../../../components/ui/Panel'
import { useSession } from '../../auth/hooks/useSession'
import { EventCardTitle } from '../../events/components/EventCardTitle'
import { EventSchedule } from '../../events/components/EventSchedule'
import { EventStatusBadge } from '../../events/components/EventStatusBadge'
import { useMyEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { EventRegistration } from '../../teams/components/EventRegistration'

/**
 * First screen for players who aren't in the active event (feature 026, FR-002): their own
 * events first, then the active event's board on demand.
 */
export function MyEventsLanding({
  activeEvent,
  browsing,
  onBrowse,
  board,
}: {
  activeEvent: BingoEvent | null
  browsing: boolean
  onBrowse: () => void
  board: ReactNode
}) {
  const { t } = useTranslation()
  const session = useSession()
  const mine = useMyEvents(Boolean(session.data))

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
          {t('home.eyebrow')}
        </span>
        <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
          {t('home.title')}
        </h1>
      </div>
      {!session.data ? (
        <InfoBanner>
          {t('home.login')}{' '}
          <Link to="/login" className="font-semibold text-rs-gold-bright">
            {t('auth.login')}
          </Link>
        </InfoBanner>
      ) : mine.isLoading ? (
        <p role="status" className="text-rs-muted">
          {t('common.loading')}
        </p>
      ) : mine.isError ? (
        <p role="alert">{t('common.apiError')}</p>
      ) : mine.data?.length ? (
        <section aria-label={t('home.title')} className="flex flex-col gap-3">
          {mine.data.map((event) => (
            <Panel as="section" key={event.id} className="flex flex-col gap-2 p-4">
              <EventCardTitle event={event} />
              <EventSchedule event={event} />
              <EventRegistration event={event} />
            </Panel>
          ))}
        </section>
      ) : (
        <p className="m-0 rounded border border-rs-border bg-rs-surface p-6 text-center text-rs-muted">
          {t('home.none')}{' '}
          <Link to="/events" className="font-semibold text-rs-gold-bright">
            {t('home.browseEvents')}
          </Link>
        </p>
      )}
      {activeEvent && (
        <Panel className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <strong className="text-rs-gold-bright">{activeEvent.name}</strong>
              <EventStatusBadge status={activeEvent.status} />
            </span>
            <span className="text-[13px] text-rs-muted">{t('home.notPlaying')}</span>
          </div>
          {!browsing && (
            <Button onClick={onBrowse}>
              <GridViewOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('home.browseBoard')}
            </Button>
          )}
        </Panel>
      )}
      {browsing && board}
    </>
  )
}
