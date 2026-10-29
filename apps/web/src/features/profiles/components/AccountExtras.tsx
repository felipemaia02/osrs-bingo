import { useTranslation } from 'react-i18next'
import { BossKcBreakdownButton } from '../../balance/components/BossKcBreakdown'
import { bossLabel, useBossKcSettings } from '../../balance/hooks'
import { useStatFormat } from '../hooks/useStatFormat'
import type { LinkedAccount } from '../types'

const TOP_BOSSES = 5

/** This account's boss KC, raids KC and top bosses (feature 039 data on the profile). */
export function AccountBosses({ account }: { account: LinkedAccount }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const settings = useBossKcSettings()
  if (!account.bosses) return null
  const excluded = new Set(settings.data?.excluded ?? [])
  const raids = new Set(settings.data?.raids ?? [])
  const entries = Object.entries(account.bosses)
  const sum = (keep: (boss: string) => boolean) =>
    entries.filter(([boss]) => keep(boss)).reduce((total, [, kills]) => total + kills, 0)
  const boss = sum((name) => !excluded.has(name) && !raids.has(name))
  const raid = sum((name) => !excluded.has(name) && raids.has(name))
  const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, TOP_BOSSES)
  return (
    <section
      aria-label={t('profile.bosses.title')}
      className="flex flex-col gap-2 rounded-[3px] border border-rs-border/40 bg-rs-inset p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-rs-muted">
          {t('profile.bosses.title')}
        </span>
        <BossKcBreakdownButton name={account.rsn} accounts={[account]} />
      </div>
      <dl className="m-0 grid grid-cols-2 gap-1.5">
        {(
          [
            [t('profile.bosses.counted'), boss],
            [t('profile.bosses.raids'), raid],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-[11px] text-rs-muted">{label}</dt>
            <dd className="m-0 text-[15px] font-bold tabular-nums text-rs-gold-bright">
              {format.whole(value)}
            </dd>
          </div>
        ))}
      </dl>
      {top.length > 0 && (
        <ul aria-label={t('profile.bosses.top')} className="m-0 flex list-none flex-wrap gap-1 p-0">
          {top.map(([name, kills]) => (
            <li
              key={name}
              className={`rounded-[2px] border border-rs-border/50 px-1.5 py-px text-[11px] ${
                excluded.has(name) ? 'text-rs-muted line-through' : ''
              }`}
            >
              {bossLabel(name)} <strong className="tabular-nums">{format.whole(kills)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
