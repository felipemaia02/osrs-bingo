import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../auth/hooks/useSession'
import { useReviewAccess } from '../../submissions/hooks/useReviewAccess'
import { AppShell } from '../../../components/common/AppShell'
import {
  LoginRequiredScreen,
  NoAccessScreen,
  OfflineScreen,
} from '../../../components/common/status/StatusScreens'

const REVIEW_PATH = '/admin/review'

/** Admin pages: visitors are asked to log in, players see "no access" (feature 027). Captains
 * and reviewers of the active event may open the review page only (feature 064). */
export function AdminRoute() {
  const { t } = useTranslation()
  const session = useSession()
  const access = useReviewAccess()
  const { pathname } = useLocation()
  if (session.isLoading || (pathname === REVIEW_PATH && access.loading))
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
  if (!session.data.is_admin && !(pathname === REVIEW_PATH && access.teamReviewer))
    return (
      <AppShell>
        <NoAccessScreen />
      </AppShell>
    )
  return <Outlet />
}
