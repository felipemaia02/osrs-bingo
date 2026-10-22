import { useState, type FormEvent } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import type { CurrentUser } from '../../auth/api/authApi'
import { useSession } from '../../auth/hooks/useSession'
import { UserDirectoryCards, UserDirectoryTable } from '../components/UserDirectoryList'
import { DIRECTORY_PAGE_SIZE, useChangeRole, useUserDirectory } from '../hooks/useAdministration'
import { roleErrorKey } from '../roleErrors'

/** Layout v2 administrators directory (no mockup; design system + teams v2 patterns). */
export function AdministratorsPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const session = useSession()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [target, setTarget] = useState<CurrentUser | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const users = useUserDirectory(search, offset)
  const mutation = useChangeRole()
  const directory = users.data

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setOffset(0)
  }

  function openRoleChange(user: CurrentUser) {
    setFeedback(null)
    setRoleError(null)
    setTarget(user)
  }

  async function confirmRoleChange() {
    if (!target) return
    setRoleError(null)
    try {
      await mutation.mutateAsync({ userId: target.id, isAdmin: !target.is_admin })
      setTarget(null)
      setFeedback(t('admin.updated'))
    } catch (error) {
      setRoleError(t(roleErrorKey(error)))
    }
  }

  const summary = directory && (
    <span className="text-[13px] text-rs-muted">
      {t('admin.directoryCount', { count: directory.total })} ·{' '}
      {t('admin.adminCount', { count: directory.admin_count })}
    </span>
  )
  const listProps = {
    users: directory?.items ?? [],
    currentUserId: session.data?.id,
    busy: mutation.isPending,
    onChangeRole: openRoleChange,
  }
  const lastShown = directory ? Math.min(offset + DIRECTORY_PAGE_SIZE, directory.total) : 0

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex max-w-5xl flex-col gap-3 md:gap-4">
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
            {t('admin.administrators')}
          </h1>
          <span className="text-rs-muted">{t('admin.globalNotice')}</span>
          {summary}
        </div>
        {feedback && (
          <p role="status" className="m-0 text-sm">
            {feedback}
          </p>
        )}
        <form onSubmit={submitSearch} className="flex gap-2">
          <label className="relative flex min-w-0 flex-1 items-center">
            <SearchOutlinedIcon
              fontSize="small"
              className="pointer-events-none absolute left-2.5 text-rs-muted"
              aria-hidden="true"
            />
            <span className="sr-only">{t('admin.searchUsers')}</span>
            <input
              type="search"
              maxLength={64}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('admin.searchPlaceholder')}
              className="min-h-11 w-full rounded-[3px] border border-rs-border bg-rs-inset pl-[38px] pr-3 text-base text-rs-text placeholder:text-rs-muted md:min-h-10 md:text-sm"
            />
          </label>
          <Button type="submit">{t('admin.search')}</Button>
        </form>
        {users.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : users.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : directory && !directory.items.length ? (
          <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
            {t('admin.noUsers')}
          </p>
        ) : directory ? (
          <>
            {isDesktop ? (
              <div className="overflow-hidden rounded border border-rs-border bg-rs-surface">
                <UserDirectoryTable {...listProps} />
              </div>
            ) : (
              <UserDirectoryCards {...listProps} />
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-rs-muted">
                {t('admin.showing', { from: offset + 1, to: lastShown, total: directory.total })}
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={offset === 0 || users.isFetching}
                  onClick={() => setOffset(Math.max(0, offset - DIRECTORY_PAGE_SIZE))}
                >
                  {t('admin.previous')}
                </Button>
                <Button
                  disabled={offset + DIRECTORY_PAGE_SIZE >= directory.total || users.isFetching}
                  onClick={() => setOffset(offset + DIRECTORY_PAGE_SIZE)}
                >
                  {t('admin.next')}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {target && (
        <ConfirmDialog
          title={t('admin.confirmTitle')}
          message={t(target.is_admin ? 'admin.revokeMessage' : 'admin.grantMessage', {
            name: target.username,
          })}
          confirmLabel={t('admin.confirm')}
          danger={target.is_admin}
          busy={mutation.isPending}
          error={roleError}
          onConfirm={() => void confirmRoleChange()}
          onClose={() => setTarget(null)}
        />
      )}
    </AppShell>
  )
}
