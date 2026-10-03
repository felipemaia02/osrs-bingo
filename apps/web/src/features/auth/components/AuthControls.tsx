import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLogout, useSession } from '../hooks/useSession'

export function AuthControls() {
  const { t } = useTranslation()
  const session = useSession()
  const logout = useLogout()
  if (session.isLoading) return <span className="text-xs text-rs-muted">{t('common.loading')}</span>
  if (session.isError)
    return (
      <span role="alert" className="text-xs text-rs-muted">
        {t('common.apiError')}
      </span>
    )
  if (!session.data)
    return (
      <Link
        to="/login"
        className="rounded-sm border border-rs-border px-3 py-2 text-xs text-rs-gold"
      >
        {t('auth.login')}
      </Link>
    )
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-rs-muted">
      <span>{session.data.username}</span>
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="rounded-sm border border-rs-border px-2 py-1 disabled:opacity-50"
      >
        {t('auth.logout')}
      </button>
      {logout.isError && <span role="alert">{t('common.apiError')}</span>}
    </div>
  )
}
