import { useTranslation } from 'react-i18next'
import { BossKcBreakdownButton, type KcAccount } from '../../balance/components/BossKcBreakdown'
import { Panel } from '../../../components/ui/Panel'
import { useStatFormat } from '../hooks/useStatFormat'
import type { BalanceTotals as Totals } from '../types'

/** Boss KC and EHB over the main and the alts found on Wise Old Man (FR-005). */
export function BalanceTotals({
  totals,
  accounts = [],
}: {
  totals: Totals
  /** For the per-boss breakdown (feature 039). */
  accounts?: KcAccount[]
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  return (
    <Panel as="section" aria-labelledby="profile-balance-title" className="flex flex-col gap-2 p-4">
      <h2
        id="profile-balance-title"
        className="m-0 font-display text-lg font-bold text-rs-gold-bright"
      >
        {t('profile.balance.title')}
      </h2>
      <span className="text-[13px] text-rs-muted">{t('profile.balance.description')}</span>
      <dl className="m-0 flex flex-col">
        <div className="flex items-baseline justify-between border-b border-rs-border/40 py-2">
          <dt>{t('profile.balance.bossKc')}</dt>
          <dd className="m-0 text-xl font-bold tabular-nums text-rs-gold-bright">
            {format.whole(totals.boss_kc)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-rs-border/40 py-2">
          <dt>{t('profile.balance.raidsKc')}</dt>
          <dd className="m-0 text-xl font-bold tabular-nums text-rs-gold-bright">
            {format.whole(totals.raids_kc ?? 0)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-rs-border/40 py-2">
          <dt>{t('profile.balance.ehb')}</dt>
          <dd className="m-0 text-xl font-bold tabular-nums text-rs-gold-bright">
            {format.hours(totals.ehb)}
          </dd>
        </div>
      </dl>
      {accounts.length > 0 && (
        <BossKcBreakdownButton
          name={t('profile.balance.title')}
          accounts={accounts}
          className="self-start"
        />
      )}
      <span className="text-[13px] text-rs-muted">
        {t('profile.balance.counted', { counted: totals.counted, total: totals.total })}
        {totals.not_found.length > 0 &&
          ` · ${t('profile.balance.notFound', { names: totals.not_found.join(', ') })}`}
      </span>
    </Panel>
  )
}
