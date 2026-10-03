import { useState, type FormEvent } from 'react'
import Dialog from '@mui/material/Dialog'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import type { CurrentUser } from '../../auth/api/authApi'
import { useChangeRole, useUserDirectory, DIRECTORY_PAGE_SIZE } from '../hooks/useAdministration'

const ERROR_KEYS: Record<string, string> = {
  'Cannot remove the last administrator': 'admin.errors.lastAdmin',
  'Administrator roles changed; try again': 'admin.errors.changed',
  'Administration is not initialized': 'admin.errors.notInitialized',
  'User not found': 'admin.errors.userNotFound',
  'Administrator access required': 'auth.adminRequired',
  'Authentication required': 'auth.loginRequired',
  'Too many requests': 'admin.errors.rateLimit',
}

export function AdministratorsPage() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [target, setTarget] = useState<CurrentUser | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const users = useUserDirectory(search, offset)
  const mutation = useChangeRole()

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setOffset(0)
  }

  async function confirmRoleChange() {
    if (!target) return
    setFeedback(null)
    try {
      await mutation.mutateAsync({ userId: target.id, isAdmin: !target.is_admin })
      setTarget(null)
      setFeedback('admin.updated')
    } catch (error) {
      const detail = error instanceof AxiosError ? error.response?.data?.detail : null
      setFeedback(
        typeof detail === 'string' ? (ERROR_KEYS[detail] ?? 'common.apiError') : 'common.apiError',
      )
      setTarget(null)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-rs-text">
            {t('admin.administrators')}
          </h1>
          <p className="mt-2 text-sm text-rs-muted">{t('admin.globalNotice')}</p>
        </div>
        {feedback && (
          <p
            role="status"
            className="rounded-sm border border-rs-border bg-rs-inset p-3 text-sm text-rs-text"
          >
            {t(feedback)}
          </p>
        )}
        <Panel className="p-4">
          <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-sm text-rs-muted">
              {t('admin.searchUsers')}
              <input
                maxLength={64}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
              />
            </label>
            <button className="rounded-sm border border-rs-border px-4 py-2 text-sm text-rs-gold">
              {t('admin.search')}
            </button>
          </form>
          {users.isLoading && (
            <p role="status" className="mt-5 text-sm text-rs-muted">
              {t('common.loading')}
            </p>
          )}
          {users.isError && (
            <p role="alert" className="mt-5 text-sm text-rs-muted">
              {t('common.apiError')}
            </p>
          )}
          {users.data && (
            <>
              <p className="mt-5 text-xs text-rs-muted">
                {t('admin.directoryCount', { count: users.data.total })}
              </p>
              {!users.data.items.length && (
                <p className="mt-3 text-sm text-rs-muted">{t('admin.noUsers')}</p>
              )}
              <ul className="mt-3 divide-y divide-rs-border/40">
                {users.data.items.map((user) => (
                  <li
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-rs-text">{user.username}</p>
                      <p className="mt-1 break-all text-xs text-rs-muted">
                        {t('admin.discordIdentity', { id: user.discord_id })}
                      </p>
                      <p className="mt-1 text-xs text-rs-muted">
                        {t(user.is_admin ? 'admin.adminRole' : 'admin.playerRole')}
                      </p>
                    </div>
                    <button
                      disabled={mutation.isPending}
                      onClick={() => {
                        setFeedback(null)
                        setTarget(user)
                      }}
                      aria-label={t(user.is_admin ? 'admin.revokeFrom' : 'admin.grantTo', {
                        name: user.username,
                      })}
                      className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-gold disabled:opacity-50"
                    >
                      {t(user.is_admin ? 'admin.revoke' : 'admin.grant')}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between gap-3">
                <button
                  disabled={offset === 0 || users.isFetching}
                  onClick={() => setOffset(Math.max(0, offset - DIRECTORY_PAGE_SIZE))}
                  className="text-sm text-rs-muted disabled:opacity-40"
                >
                  {t('admin.previous')}
                </button>
                <button
                  disabled={offset + DIRECTORY_PAGE_SIZE >= users.data.total || users.isFetching}
                  onClick={() => setOffset(offset + DIRECTORY_PAGE_SIZE)}
                  className="text-sm text-rs-muted disabled:opacity-40"
                >
                  {t('admin.next')}
                </button>
              </div>
            </>
          )}
        </Panel>
        <Dialog
          open={Boolean(target)}
          onClose={() => {
            if (!mutation.isPending) setTarget(null)
          }}
          aria-labelledby="admin-role-title"
        >
          <div className="border border-rs-border bg-rs-surface p-5 text-rs-text">
            <h2 id="admin-role-title" className="font-display text-lg text-rs-gold-bright">
              {t('admin.confirmTitle')}
            </h2>
            <p className="mt-3 text-sm">
              {t(target?.is_admin ? 'admin.revokeMessage' : 'admin.grantMessage', {
                name: target?.username,
              })}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                disabled={mutation.isPending}
                onClick={() => setTarget(null)}
                className="rounded-sm border border-rs-border px-3 py-2 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={mutation.isPending}
                onClick={() => void confirmRoleChange()}
                className="rounded-sm bg-rs-gold px-3 py-2 text-sm font-semibold text-rs-inset"
              >
                {t(mutation.isPending ? 'common.saving' : 'admin.confirm')}
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </AppShell>
  )
}
