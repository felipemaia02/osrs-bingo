import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../auth/hooks/useSession'
import { AppShell } from '../../../components/common/AppShell'
import {
  LoginRequiredScreen,
  NoAccessScreen,
  OfflineScreen,
} from '../../../components/common/status/StatusScreens'

/** Admin pages: visitors are asked to log in, players see "no access" (feature 027). */
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
        <OfflineScreen onRetry={() => void session.refetch()} />
      </AppShell>
    )
  if (!session.data)
    return (
      <AppShell>
        <LoginRequiredScreen />
      </AppShell>
    )
  if (!session.data.is_admin)
    return (
      <AppShell>
        <NoAccessScreen />
      </AppShell>
    )
  return <Outlet />
}
