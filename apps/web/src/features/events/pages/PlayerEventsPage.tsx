import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { EventRegistration } from '../../teams/components/EventRegistration'
import { EventRulesText } from '../components/EventRulesText'
import { EventSchedule } from '../components/EventSchedule'
import { EventStatusBadge } from '../components/EventStatusBadge'
import { EVENT_PANEL_ID, EventTabs } from '../components/EventTabs'
import { useEvents } from '../hooks/useEvents'
import { useEventTabs } from '../hooks/useEventTabs'

/** Layout v2 player events page: event cards with the player's own registration. */
export function PlayerEventsPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const [params] = useSearchParams()
  const events = useEvents()
  const tabs = useEventTabs(events.data ?? [])

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('events.publicEyebrow')}
          </span>
          <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {t('events.title')}
          </h1>
          <span className="text-rs-muted">{t('events.publicDescription')}</span>
        </div>
        {params.get('login') === 'failed' && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t('auth.loginFailed')}
          </p>
        )}
        {events.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : (
          <>
            <EventTabs
              tab={tabs.tab}
              counts={tabs.counts}
              onChange={tabs.setTab}
              mobile={!isDesktop}
            />
            <div
              role="tabpanel"
              id={EVENT_PANEL_ID}
              aria-labelledby={`events-tab-${tabs.tab}`}
              className="flex flex-col gap-3"
            >
              {!tabs.visible.length && (
                <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                  {t('events.empty')}
                </p>
              )}
              {tabs.visible.map((event) => (
                <article
                  key={event.id}
                  aria-labelledby={`event-${event.id}`}
                  className="flex flex-col gap-2 rounded border border-rs-border bg-rs-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={`event-${event.id}`}
                      className="m-0 font-display text-lg font-bold text-rs-gold-bright md:text-xl"
                    >
                      {event.name}
                    </h2>
                    <EventStatusBadge status={event.status} />
                  </div>
                  <EventSchedule event={event} />
                  {event.description && (
                    <p className="m-0 text-sm text-rs-muted">{event.description}</p>
                  )}
                  {event.rules_text && <EventRulesText text={event.rules_text} />}
                  <EventRegistration event={event} />
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
