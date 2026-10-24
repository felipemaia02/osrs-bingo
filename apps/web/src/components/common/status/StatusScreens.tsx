import ExploreOffOutlinedIcon from '@mui/icons-material/ExploreOffOutlined'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'
import HeartBrokenOutlinedIcon from '@mui/icons-material/HeartBrokenOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PublicOffOutlinedIcon from '@mui/icons-material/PublicOffOutlined'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../AppShell'
import { StatusScreen } from './StatusScreen'
import { StatusAnchor, StatusLink } from './statusLinks'
import { STATUS_BUTTON_CLASS } from './statusStyles'

/** 404 for any unknown route (feature 027, FR-002). */
export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <AppShell>
      <StatusScreen
        icon={<ExploreOffOutlinedIcon />}
        eyebrow={t('status.notFound.eyebrow')}
        title={t('status.notFound.title')}
        message={t('status.notFound.message')}
        actions={
          <>
            <StatusLink to="/" primary>
              {t('status.home')}
            </StatusLink>
            <StatusLink to="/events">{t('navigation.events')}</StatusLink>
          </>
        }
      />
    </AppShell>
  )
}

/** Logged-in players on admin pages (FR-003). */
export function NoAccessScreen() {
  const { t } = useTranslation()
  return (
    <StatusScreen
      icon={<GppBadOutlinedIcon />}
      eyebrow={t('status.noAccess.eyebrow')}
      title={t('status.noAccess.title')}
      message={t('status.noAccess.message')}
      actions={
        <StatusLink to="/" primary>
          {t('status.home')}
        </StatusLink>
      }
    />
  )
}

/** Visitors on pages that need a login (FR-004). */
export function LoginRequiredScreen() {
  const { t } = useTranslation()
  return (
    <StatusScreen
      icon={<LoginOutlinedIcon />}
      eyebrow={t('status.login.eyebrow')}
      title={t('status.login.title')}
      message={t('status.login.message')}
      actions={
        <>
          <StatusLink to="/login" primary>
            {t('auth.login')}
          </StatusLink>
          <StatusLink to="/">{t('status.home')}</StatusLink>
        </>
      }
    />
  )
}

/** The API can't be reached at all (FR-006). */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <StatusScreen
      icon={<PublicOffOutlinedIcon />}
      eyebrow={t('status.offline.eyebrow')}
      title={t('status.offline.title')}
      message={t('status.offline.message')}
      actions={
        <button type="button" onClick={onRetry} className={STATUS_BUTTON_CLASS.primary}>
          {t('status.offline.retry')}
        </button>
      }
    />
  )
}

/** Rendering crash; outside the router and shell, which may be what broke (FR-005). */
export function CrashScreen() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-rs-canvas px-4 py-8 text-rs-text">
      <StatusScreen
        tone="danger"
        icon={<HeartBrokenOutlinedIcon />}
        eyebrow={t('status.crash.eyebrow')}
        title={t('status.crash.title')}
        message={t('status.crash.message')}
        actions={
          <>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={STATUS_BUTTON_CLASS.primary}
            >
              {t('status.crash.respawn')}
            </button>
            <StatusAnchor href="/">{t('status.home')}</StatusAnchor>
          </>
        }
      />
    </div>
  )
}
