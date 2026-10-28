import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { bossLabel, useBossKcSettings } from '../hooks'

export interface KcAccount {
  rsn: string
  is_main: boolean
  bosses?: Record<string, number> | null
}

/** Opens the per-boss KC of each account (feature 039). */
export function BossKcBreakdownButton({
  name,
  accounts,
  className = '',
}: {
  name: string
  accounts: KcAccount[]
  className?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" className={className} onClick={() => setOpen(true)}>
        {t('balance.breakdown.open')}
      </Button>
      {open && <BossKcBreakdown name={name} accounts={accounts} onClose={() => setOpen(false)} />}
    </>
  )
}

export function BossKcBreakdown({
  name,
  accounts,
  onClose,
}: {
  name: string
  accounts: KcAccount[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const settings = useBossKcSettings()
  const excluded = new Set(settings.data?.excluded ?? [])
  const raids = new Set(settings.data?.raids ?? [])
  return (
    <FormModal title={t('balance.breakdown.title', { name })} busy={false} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-xs text-rs-muted">{t('balance.breakdown.hint')}</p>
        {accounts.map((account) => {
          const rows = Object.entries(account.bosses ?? {}).sort((a, b) => b[1] - a[1])
          return (
            <section key={account.rsn} aria-label={account.rsn} className="flex flex-col gap-1.5">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-rs-gold-bright">
                {account.rsn}
                <Badge tone={account.is_main ? 'gold' : 'neutral'}>
                  {t(account.is_main ? 'join.account.main' : 'join.account.alt')}
                </Badge>
              </h3>
              {!account.bosses ? (
                <p className="m-0 text-[13px] text-rs-muted">{t('balance.breakdown.notLoaded')}</p>
              ) : !rows.length ? (
                <p className="m-0 text-[13px] text-rs-muted">{t('balance.breakdown.none')}</p>
              ) : (
                <ul className="m-0 grid list-none gap-x-4 gap-y-0.5 p-0 text-[13px] sm:grid-cols-2">
                  {rows.map(([boss, kills]) => (
                    <li
                      key={boss}
                      className={`flex items-center justify-between gap-2 border-b border-rs-border/30 py-1 ${
                        excluded.has(boss) ? 'text-rs-muted line-through' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{bossLabel(boss)}</span>
                        {raids.has(boss) && <Badge tone="info">{t('balance.raid')}</Badge>}
                        {excluded.has(boss) && (
                          <Badge tone="neutral">{t('balance.notCounted')}</Badge>
                        )}
                      </span>
                      <strong className="tabular-nums">{format.whole(kills)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </FormModal>
  )
}
