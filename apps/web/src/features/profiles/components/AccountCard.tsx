import { useState } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import StarIcon from '@mui/icons-material/Star'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ThemedMenu, ThemedMenuItem } from '../../../components/ui/ThemedMenu'
import { useSubmissionTime } from '../../submissions/hooks/useSubmissionTime'
import { useStatFormat } from '../hooks/useStatFormat'
import { COMBAT_SKILLS, type AccountAction, type LinkedAccount } from '../types'

interface AccountCardProps {
  account: LinkedAccount
  /** The main can be removed only when it's the last account. */
  removable: boolean
  busy: boolean
  error: string | null
  onAction: (action: AccountAction) => void
}

/** One linked OSRS account with its Wise Old Man stats and actions (FR-003, FR-004). */
export function AccountCard({ account, removable, busy, error, onAction }: AccountCardProps) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const time = useSubmissionTime()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const notFound = account.wom_status === 'not_found'
  const hasStats = account.boss_kc !== null
  const primary: AccountAction = notFound ? 'track' : account.is_main ? 'refresh' : 'main'
  const menu: AccountAction[] = (['refresh', 'main', 'remove'] as const).filter(
    (action) =>
      action !== primary &&
      !(action === 'main' && account.is_main) &&
      !(action === 'remove' && (!removable || notFound)),
  )
  const menuId = `account-menu-${account.id}`
  const run = (action: AccountAction) => {
    setAnchor(null)
    onAction(action)
  }

  return (
    <article
      aria-label={t(account.is_main ? 'profile.account.mainLabel' : 'profile.account.altLabel', {
        rsn: account.rsn,
      })}
      aria-busy={busy}
      className={`flex flex-col gap-3 rounded border bg-rs-surface px-4 py-3.5 shadow-rs-panel ${
        account.is_main ? 'border-rs-border-strong' : 'border-rs-border/70'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {account.is_main && (
          <StarIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
        )}
        <strong className="text-base text-rs-gold-bright">{account.rsn}</strong>
        <Badge tone={account.is_main ? 'gold' : 'neutral'}>
          {t(account.is_main ? 'profile.account.main' : 'profile.account.alt')}
        </Badge>
        <WomBadge account={account} />
        <span className="ml-auto flex items-center gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => run(primary)}>
            {primary === 'refresh' && (
              <RefreshOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
            )}
            {t(`profile.actions.${primary}`)}
          </Button>
          {notFound && removable && (
            <Button size="sm" disabled={busy} onClick={() => run('remove')}>
              {t('profile.actions.remove')}
            </Button>
          )}
          {menu.length > 0 && (
            <>
              <Button
                size="icon"
                disabled={busy}
                aria-label={t('profile.actions.more', { rsn: account.rsn })}
                aria-haspopup="menu"
                aria-expanded={anchor !== null}
                aria-controls={anchor ? menuId : undefined}
                onClick={(event) => setAnchor(event.currentTarget)}
              >
                <MoreVertOutlinedIcon fontSize="small" aria-hidden="true" />
              </Button>
              <ThemedMenu id={menuId} anchorEl={anchor} onClose={() => setAnchor(null)}>
                {menu.map((action) => (
                  <ThemedMenuItem key={action} onClick={() => run(action)}>
                    {t(`profile.actions.${action}`)}
                  </ThemedMenuItem>
                ))}
              </ThemedMenu>
            </>
          )}
        </span>
      </div>

      {notFound ? (
        <span className="text-[13px] text-rs-muted">{t('profile.account.notFoundHint')}</span>
      ) : (
        <>
          {hasStats && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat
                label={t('profile.stats.totalLevel')}
                value={format.whole(account.total_level)}
              />
              <Stat label={t('profile.stats.ehp')} value={format.hours(account.ehp)} />
              <Stat label={t('profile.stats.ehb')} value={format.hours(account.ehb)} />
              <Stat label={t('profile.stats.bossKc')} value={format.whole(account.boss_kc)} />
            </div>
          )}
          {account.combat && (
            <dl
              aria-label={t('profile.combat.title')}
              className="m-0 grid grid-cols-4 gap-1.5 md:grid-cols-7"
            >
              {COMBAT_SKILLS.map((skill) => (
                <div
                  key={skill}
                  className="flex flex-col items-center rounded-[3px] border border-rs-border/40 bg-rs-inset px-1 py-1.5"
                >
                  <dt className="max-w-full truncate text-[11px] text-rs-muted">
                    {t(`profile.combat.${skill}`)}
                  </dt>
                  <dd className="m-0 text-[15px] font-bold tabular-nums text-rs-gold-bright">
                    {format.whole(account.combat?.[skill] ?? null)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <span className="text-[13px] text-rs-muted">
            {account.wom_updated_at &&
              `${t('profile.account.updated', { ago: time.ago(account.wom_updated_at) })} · `}
            <a
              href={account.wom_url}
              target="_blank"
              rel="noreferrer"
              className="text-rs-gold-bright hover:text-rs-gold-hover"
            >
              {t('profile.account.openWom')}
            </a>
            {!account.is_main && ` · ${t('profile.account.altNote')}`}
          </span>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-[13px] text-rs-danger-text">
          {t(error)}
        </p>
      )}
    </article>
  )
}

function WomBadge({ account }: { account: LinkedAccount }) {
  const { t } = useTranslation()
  if (account.wom_status === 'found')
    return (
      <Badge tone="success">
        <CheckCircleIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('profile.wom.found')}
      </Badge>
    )
  if (account.wom_status === 'not_found')
    return (
      <Badge tone="danger">
        <ErrorOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('profile.wom.notFound')}
      </Badge>
    )
  return (
    <Badge tone="info">
      <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
      {t('profile.wom.unavailable')}
    </Badge>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-[3px] border border-rs-border/60 bg-rs-inset px-2.5 py-2">
      <span className="text-[11px] uppercase tracking-[.04em] text-rs-muted">{label}</span>
      <strong className="text-lg tabular-nums text-rs-gold-bright">{value}</strong>
    </div>
  )
}
