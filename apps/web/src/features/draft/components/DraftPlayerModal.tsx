import { useTranslation } from 'react-i18next'
import { BossKcBreakdownButton } from '../../balance/components/BossKcBreakdown'
import { Badge } from '../../../components/ui/Badge'
import { FormModal } from '../../../components/ui/FormModal'
import { CombatLevels } from '../../profiles/components/CombatLevels'
import { Quests } from '../../profiles/components/Quests'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { zoneLabel } from '../../profiles/timezones'
import { useRequestedFormat } from '../../teams/hooks/useRequestedFormat'
import type { AccountSnapshot, Player } from '../../teams/types'

/** Everything about a player that matters for the pick session (feature 024, FR-009). */
export function DraftPlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const requested = useRequestedFormat()
  const facts: Array<[string, string]> = [
    [t('draft.modal.discord'), player.discord_username ?? '—'],
    [t('teams.roster.role'), player.role ? t(`teams.roles.${player.role}`) : '—'],
    [t('teams.roster.timezone'), player.timezone ? zoneLabel(player.timezone) : '—'],
    [
      t('teams.roster.activity'),
      player.activity ? t(`join.activity.options.${player.activity}`) : '—',
    ],
    [t('teams.roster.teammates'), player.teammates?.length ? player.teammates.join(', ') : '—'],
    [t('teams.roster.requested'), requested(player)],
    [t('draft.ehb'), format.hours(player.ehb_total ?? null)],
    [t('draft.bossKc'), format.whole(player.boss_kc_total ?? null)],
    [t('draft.raidsKc'), format.whole(player.raids_kc_total ?? null)],
  ]
  if (player.buy_in_status)
    facts.splice(2, 0, [t('teams.roster.buyIn'), t(`teams.buyIn.${player.buy_in_status}`)])

  return (
    <FormModal title={player.display_name} busy={false} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <dl className="m-0 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs text-rs-muted">{label}</dt>
              <dd className="m-0 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby="draft-accounts-title" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3
              id="draft-accounts-title"
              className="m-0 font-display text-base font-bold text-rs-gold-bright"
            >
              {t('draft.modal.accounts')}
            </h3>
            {player.accounts?.length ? (
              <BossKcBreakdownButton name={player.display_name} accounts={player.accounts} />
            ) : null}
          </div>
          {player.accounts?.length ? (
            player.accounts.map((account) => (
              <AccountDetail
                key={account.id}
                account={account}
                playing={account.id === player.account?.id}
              />
            ))
          ) : (
            <p className="m-0 text-sm text-rs-muted">{t('draft.modal.noAccounts')}</p>
          )}
        </section>
      </div>
    </FormModal>
  )
}

function AccountDetail({ account, playing }: { account: AccountSnapshot; playing: boolean }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const stats: Array<[string, string]> = [
    [t('draft.totalLevel'), format.whole(account.total_level)],
    [t('draft.combatLevel'), format.whole(account.combat_level)],
    [t('profile.stats.ehp'), format.hours(account.ehp)],
    [t('profile.stats.ehb'), format.hours(account.ehb)],
    [t('teams.balance.bossKc'), format.whole(account.boss_kc)],
  ]
  return (
    <article
      aria-label={account.rsn}
      className={`flex flex-col gap-2 rounded border bg-rs-surface p-3 ${
        playing ? 'border-rs-border-strong' : 'border-rs-border/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-rs-gold-bright">{account.rsn}</strong>
        <Badge tone={account.is_main ? 'gold' : 'neutral'}>
          {t(account.is_main ? 'join.account.main' : 'join.account.alt')}
        </Badge>
        {playing && <Badge tone="info">{t('draft.modal.playing')}</Badge>}
        {account.wom_status !== 'found' && (
          <Badge tone="danger">
            {t(`profile.wom.${account.wom_status === 'not_found' ? 'notFound' : 'unavailable'}`)}
          </Badge>
        )}
      </div>
      <dl className="m-0 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col rounded-[3px] border border-rs-border/60 bg-rs-inset px-2 py-1.5"
          >
            <dt className="truncate text-[10px] uppercase tracking-[.04em] text-rs-muted">
              {label}
            </dt>
            <dd className="m-0 text-base font-bold tabular-nums text-rs-gold-bright">{value}</dd>
          </div>
        ))}
      </dl>
      {account.combat && <CombatLevels combat={account.combat} slayer={account.skills?.slayer} />}
      <Quests data={account.wikisync} />
    </article>
  )
}
