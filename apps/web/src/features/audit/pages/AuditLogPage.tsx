import { useMemo, useState } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useEvents } from '../../events/hooks/useEvents'
import { AuditFilterBar } from '../components/AuditFilterBar'
import { AuditCards, AuditTable } from '../components/AuditEntryList'
import { useAuditLog } from '../hooks/useAuditLog'
import { EMPTY_AUDIT_FILTERS, type AuditFilters } from '../types'

const ACTOR_SEARCH_DELAY_MS = 300

/** Everything that changed in the app, newest first (feature 059). No mockup. */
export function AuditLogPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS)
  const actor = useDebouncedValue(filters.actor, ACTOR_SEARCH_DELAY_MS)
  const log = useAuditLog({ ...filters, actor })
  const events = useEvents()
  const eventNames = useMemo(
    () => new Map((events.data ?? []).map((event) => [event.id, event.name])),
    [events.data],
  )
  const entries = log.data?.pages.flatMap((page) => page.items) ?? []
  const filtered = Object.values(filters).some(Boolean)

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex max-w-6xl flex-col gap-3 md:gap-4">
        {!isDesktop && (
          <Link
            to="/admin"
            className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
          >
            <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
            {t('admin.title')}
          </Link>
        )}
        <div className="flex flex-col gap-1">
          {isDesktop && (
            <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
              {t('admin.title')}
            </span>
          )}
          <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {t('admin.audit')}
          </h1>
          <span className="text-rs-muted">{t('audit.description')}</span>
          <span className="text-[13px] text-rs-muted">{t('audit.retention')}</span>
        </div>
        <AuditFilterBar filters={filters} events={events.data ?? []} onChange={setFilters} />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setFilters(EMPTY_AUDIT_FILTERS)}
          >
            {t('audit.filters.clear')}
          </Button>
        )}
        {log.isLoading ? (
          <p role="status" className="m-0 text-rs-muted">
            {t('common.loading')}
          </p>
        ) : log.isError ? (
          <p role="alert" className="m-0 text-rs-danger-text">
            {t('audit.loadError')}
          </p>
        ) : entries.length === 0 ? (
          <p className="m-0 rounded-[3px] border border-rs-border bg-rs-inset px-3 py-4 text-center text-rs-muted">
            {t(filtered ? 'audit.noMatches' : 'audit.none')}
          </p>
        ) : isDesktop ? (
          <AuditTable entries={entries} eventNames={eventNames} />
        ) : (
          <AuditCards entries={entries} eventNames={eventNames} />
        )}
        {log.hasNextPage && (
          <Button
            className="self-center"
            disabled={log.isFetchingNextPage}
            onClick={() => void log.fetchNextPage()}
          >
            {log.isFetchingNextPage ? t('common.loading') : t('audit.loadMore')}
          </Button>
        )}
      </div>
    </AppShell>
  )
}
