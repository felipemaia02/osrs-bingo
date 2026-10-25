import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { hasWomStats } from '../../profiles/accounts'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import type { LinkedAccount } from '../../profiles/types'

/** Step 1: the profile account that plays the bingo (FR-002). */
export function AccountStep({
  accounts,
  value,
  onChange,
}: {
  accounts: LinkedAccount[]
  value: string | null
  onChange: (accountId: string) => void
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  if (!accounts.some(hasWomStats))
    return (
      <p className="m-0 rounded-[3px] border border-rs-border bg-rs-inset p-3 text-sm">
        {t('join.account.none')}{' '}
        <Link to="/profile" className="font-semibold text-rs-gold-bright">
          {t('join.account.manage')}
        </Link>
      </p>
    )
  return (
    <>
      <div role="radiogroup" aria-label={t('join.account.group')} className="flex flex-col gap-2">
        {accounts.map((account) => {
          const usable = hasWomStats(account)
          const checked = account.id === value
          return (
            <label
              key={account.id}
              className={`flex items-center gap-3 rounded border px-3.5 py-3 ${
                checked
                  ? 'border-rs-gold-bright bg-rs-raised shadow-[inset_0_0_0_1px_theme(colors.rs.gold-bright)]'
                  : 'border-rs-border bg-rs-inset'
              } ${usable ? 'cursor-pointer' : 'opacity-60'}`}
            >
              <input
                type="radio"
                name="join-account"
                checked={checked}
                disabled={!usable}
                onChange={() => onChange(account.id)}
                className="m-0 size-[18px] shrink-0 accent-rs-gold"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-rs-gold-bright">{account.rsn}</strong>
                  <Badge tone={account.is_main ? 'gold' : 'neutral'}>
                    {t(account.is_main ? 'join.account.main' : 'join.account.alt')}
                  </Badge>
                </span>
                {usable && (
                  <span className="text-[13px] text-rs-muted">
                    {t('join.account.stats', {
                      ehb: format.hours(account.ehb),
                      kc: format.whole(account.boss_kc),
                      total: format.whole(account.total_level),
                    })}
                  </span>
                )}
              </span>
              {usable ? (
                <Badge tone="success">
                  <CheckCircleIcon sx={{ fontSize: 13 }} aria-hidden="true" />
                  {t('join.account.wom')}
                </Badge>
              ) : (
                <Badge tone="danger">
                  <ErrorOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
                  {t('profile.wom.notFound')}
                </Badge>
              )}
            </label>
          )
        })}
      </div>
      <span className="text-[13px] text-rs-muted">{t('join.account.othersCount')}</span>
    </>
  )
}
