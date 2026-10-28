import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { AdminEventCards, AdminEventTable } from '../components/AdminEventList'
import { EventFormModal } from '../components/EventFormModal'
import { EventRulesModal } from '../components/EventRulesModal'
import { EVENT_PANEL_ID, EventTabs } from '../components/EventTabs'
import { useEventAdmin } from '../hooks/useEventAdmin'
import { useEvents } from '../hooks/useEvents'
import { useEventTabs } from '../hooks/useEventTabs'

/** Layout v2 events administration (no mockup; design system + teams v2 patterns). */
export function AdminEventsPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents()
  const all = events.data ?? []
  const tabs = useEventTabs(all)
  const admin = useEventAdmin()
  const activeEvent = all.find((event) => event.status === 'active')

  const createButton = (
    <Button variant="primary" onClick={admin.openCreate} className={isDesktop ? '' : 'w-full'}>
      <AddOutlinedIcon fontSize="small" aria-hidden="true" />
      {t('events.actions.create')}
    </Button>
  )
  const list = tabs.visible.length ? (
    isDesktop ? (
      <AdminEventTable
        events={tabs.visible}
        onEdit={admin.openEdit}
        onRules={admin.openRules}
        onLateJoin={(event) => void admin.toggleLateJoin(event)}
        onTransition={admin.openTransition}
      />
    ) : (
      <AdminEventCards
        events={tabs.visible}
        onEdit={admin.openEdit}
        onRules={admin.openRules}
        onLateJoin={(event) => void admin.toggleLateJoin(event)}
        onTransition={admin.openTransition}
      />
    )
  ) : (
    <p className="m-0 p-8 text-center text-rs-muted">{t('events.empty')}</p>
  )

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex flex-col gap-3 md:gap-4">
        {isDesktop ? (
          <div className="flex items-end justify-between gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
                {t('admin.title')}
              </span>
              <h1 className="m-0 font-display text-[30px] font-bold leading-[1.15] text-rs-gold-bright">
                {t('events.title')}
              </h1>
              <span className="text-rs-muted">{t('events.description')}</span>
            </div>
            {createButton}
          </div>
        ) : (
          <>
            <Link
              to="/admin"
              className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              {t('admin.title')}
            </Link>
            <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright">
              {t('events.title')}
            </h1>
            {createButton}
          </>
        )}
        {admin.feedback && (
          <p role="status" className="m-0 text-sm">
            {admin.feedback}
          </p>
        )}
        {activeEvent && (
          <InfoBanner>{t('events.activeNotice', { name: activeEvent.name })}</InfoBanner>
        )}
        {events.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : isDesktop ? (
          <section className="overflow-hidden rounded border border-rs-border bg-rs-surface">
            <EventTabs tab={tabs.tab} counts={tabs.counts} onChange={tabs.setTab} mobile={false} />
            <div role="tabpanel" id={EVENT_PANEL_ID} aria-labelledby={`events-tab-${tabs.tab}`}>
              {list}
            </div>
          </section>
        ) : (
          <>
            <EventTabs tab={tabs.tab} counts={tabs.counts} onChange={tabs.setTab} mobile />
            <div role="tabpanel" id={EVENT_PANEL_ID} aria-labelledby={`events-tab-${tabs.tab}`}>
              {list}
            </div>
          </>
        )}
      </div>
      {admin.form && (
        <EventFormModal
          event={admin.form.event}
          saving={admin.saving}
          onSave={admin.save}
          onClose={admin.closeForm}
        />
      )}
      {admin.rulesEvent && (
        <EventRulesModal
          event={admin.rulesEvent}
          saving={admin.savingRules}
          onSave={admin.saveRules}
          onAddAddendum={admin.addAddendum}
          onClose={admin.closeRules}
        />
      )}
      {admin.transition && (
        <ConfirmDialog
          title={t(
            admin.transition.action === 'activate'
              ? 'events.confirm.activateTitle'
              : 'events.confirm.finishTitle',
          )}
          message={t(
            admin.transition.action === 'activate'
              ? 'events.confirm.activateMessage'
              : 'events.confirm.finishMessage',
            { name: admin.transition.event.name },
          )}
          confirmLabel={t(
            admin.transition.action === 'activate'
              ? 'events.confirm.activate'
              : 'events.confirm.finish',
          )}
          danger={admin.transition.action === 'finish'}
          busy={admin.transitioning}
          error={admin.transitionError}
          onConfirm={() => void admin.confirmTransition()}
          onClose={admin.closeTransition}
        />
      )}
    </AppShell>
  )
}
