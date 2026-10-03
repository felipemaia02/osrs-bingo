import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../auth/hooks/useSession'
import { AppShell } from '../../../components/common/AppShell'

export function AdminRoute() {
  const { t } = useTranslation()
  const session = useSession()
  if (session.isLoading)
    return (
      <p role="status" className="p-8 text-rs-muted">
        {t('common.loading')}
      </p>
    )
  if (session.isError)
    return (
      <AppShell>
        <p role="alert">{t('common.apiError')}</p>
      </AppShell>
    )
  if (!session.data) return <Navigate to="/login" replace />
  if (!session.data.is_admin)
    return (
      <AppShell>
        <p role="alert">{t('auth.adminRequired')}</p>
      </AppShell>
    )
  return <Outlet />
}
