import { useState } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useSession } from '../../auth/hooks/useSession'
import { AccountCard } from '../components/AccountCard'
import { AddAccountModal } from '../components/AddAccountModal'
import { BalanceTotals } from '../components/BalanceTotals'
import { ClanPreferences } from '../components/ClanPreferences'
import { DiscordIdentity } from '../components/DiscordIdentity'
import { profileErrorKey } from '../errors'
import { useAccountAction, useProfile } from '../hooks/useProfile'
import { MAX_ACCOUNTS, type AccountAction } from '../types'

/** My profile: Discord identity, linked OSRS accounts and clan preferences (feature 021). */
export function ProfilePage() {
  const { t } = useTranslation()
  const session = useSession()
  const profile = useProfile(Boolean(session.data))
  const action = useAccountAction()
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [failed, setFailed] = useState<{ id: string; key: string } | null>(null)

  const accounts = profile.data?.accounts ?? []
  const pendingId = action.isPending ? action.variables?.accountId : null
  const runAction = (accountId: string, kind: AccountAction) => {
    setFailed(null)
    setFeedback(null)
    action.mutate(
      { accountId, action: kind },
      { onError: (error) => setFailed({ id: accountId, key: profileErrorKey(error) }) },
    )
  }

  return (
    <AppShell desktopPadding="md:px-8 md:pt-[26px]">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-4 md:gap-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('profile.eyebrow')}
          </span>
          <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {t('profile.title')}
          </h1>
          <span className="text-[13px] text-rs-muted md:text-sm">{t('profile.description')}</span>
        </div>

        {session.isLoading || (session.data && profile.isLoading) ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : !session.data ? (
          <InfoBanner>
            {t('profile.login')}{' '}
            <Link to="/login" className="font-semibold text-rs-gold-bright">
              {t('auth.login')}
            </Link>
          </InfoBanner>
        ) : !profile.data ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : (
          <>
            <DiscordIdentity username={profile.data.username} discordId={profile.data.discord_id} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
              <section aria-labelledby="profile-accounts-title" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2
                      id="profile-accounts-title"
                      className="m-0 font-display text-lg font-bold text-rs-gold-bright"
                    >
                      {t('profile.accounts.title')}
                    </h2>
                    <span className="text-[13px] text-rs-muted">
                      {t('profile.accounts.description')}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    className="max-md:w-full"
                    disabled={accounts.length >= MAX_ACCOUNTS}
                    title={
                      accounts.length >= MAX_ACCOUNTS ? t('profile.errors.tooMany') : undefined
                    }
                    onClick={() => {
                      setFeedback(null)
                      setAdding(true)
                    }}
                  >
                    <AddOutlinedIcon fontSize="small" aria-hidden="true" />
                    {t('profile.accounts.add')}
                  </Button>
                </div>
                {feedback && (
                  <p role="status" className="m-0 text-sm">
                    {feedback}
                  </p>
                )}
                {accounts.length ? (
                  accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      removable={!account.is_main || accounts.length === 1}
                      busy={pendingId === account.id}
                      error={failed?.id === account.id ? failed.key : null}
                      onAction={(kind) => runAction(account.id, kind)}
                    />
                  ))
                ) : (
                  <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                    {t('profile.accounts.empty')}
                  </p>
                )}
              </section>
              <aside className="flex flex-col gap-3.5">
                <BalanceTotals totals={profile.data.totals} accounts={profile.data.accounts} />
                <ClanPreferences
                  saved={{ timezone: profile.data.timezone, activity: profile.data.activity }}
                />
              </aside>
            </div>
          </>
        )}
      </div>
      {adding && (
        <AddAccountModal
          first={accounts.length === 0}
          onAdded={(rsn) => {
            setAdding(false)
            setFeedback(t('profile.add.added', { rsn }))
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </AppShell>
  )
}
