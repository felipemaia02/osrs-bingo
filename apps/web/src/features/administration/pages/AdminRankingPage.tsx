import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { useEvents } from '../../events/hooks/useEvents'

export function AdminRankingPage() {
  const { t } = useTranslation()
  const events = useEvents()
  const [eventId, setEventId] = useState('')
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <h1 className="font-display text-2xl font-bold text-rs-text">{t('admin.ranking')}</h1>
        <Panel className="p-4">
          <label className="text-sm text-rs-muted">
            {t('teams.event')}
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
            >
              <option value="">{t('teams.selectEvent')}</option>
              {events.data?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {t(`events.status.${event.status}`)}
                </option>
              ))}
            </select>
          </label>
        </Panel>
        {events.isLoading && <p role="status">{t('common.loading')}</p>}
        {events.isError && <p role="alert">{t('common.apiError')}</p>}
        <Panel className="p-6">
          <p role="status" className="text-sm text-rs-muted">
            {t(eventId ? 'admin.rankingUnavailable' : 'teams.selectEvent')}
          </p>
        </Panel>
      </div>
    </AppShell>
  )
}
