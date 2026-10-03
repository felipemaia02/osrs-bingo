import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher'
import { discordLoginUrl } from '../api/authApi'
import { useSession } from '../hooks/useSession'

export function LoginPage() {
  const { t } = useTranslation()
  const session = useSession()
  const [search] = useSearchParams()
  const loginError = search.get('login')

  if (session.data) return <Navigate to={session.data.is_admin ? '/admin' : '/events'} replace />

  return (
    <main className="flex min-h-screen flex-col bg-rs-canvas px-4 py-6 text-rs-text sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          to="/events"
          className="flex items-center gap-2 text-sm text-rs-muted hover:text-rs-gold"
        >
          <ArrowBackOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('auth.backToEvents')}
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-sm border border-rs-border-strong bg-rs-inset text-rs-gold">
            <ShieldOutlinedIcon sx={{ fontSize: 36 }} aria-hidden="true" />
          </div>
          <p className="font-display text-xl font-bold tracking-[.12em] text-rs-gold-bright">
            THUNDER CRABS
          </p>
          <p className="mt-2 text-xs uppercase tracking-[.2em] text-rs-muted">
            {t('auth.loginEyebrow')}
          </p>
        </div>
        <section
          aria-labelledby="login-title"
          className="rounded-sm border border-rs-border bg-rs-surface p-6 shadow-rs-panel sm:p-8"
        >
          <h1 id="login-title" className="font-display text-2xl font-bold text-rs-gold-bright">
            {t('auth.loginTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-rs-muted">{t('auth.loginDescription')}</p>
          {loginError && (
            <p
              role="alert"
              className="mt-5 rounded-sm border border-rs-border bg-rs-inset p-3 text-sm text-rs-text"
            >
              {t(loginError === 'unavailable' ? 'auth.notConfigured' : 'auth.loginFailed')}
            </p>
          )}
          {session.isLoading ? (
            <p role="status" className="mt-6 text-sm text-rs-muted">
              {t('common.loading')}
            </p>
          ) : session.isError ? (
            <div className="mt-6 space-y-3">
              <p role="alert" className="text-sm text-rs-muted">
                {t('common.apiError')}
              </p>
              <button
                onClick={() => void session.refetch()}
                className="w-full rounded-sm border border-rs-border px-4 py-3 text-sm font-semibold text-rs-gold"
              >
                {t('auth.retry')}
              </button>
            </div>
          ) : (
            <a
              href={discordLoginUrl}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border border-rs-border-strong bg-rs-gold px-4 py-3 text-sm font-bold text-rs-inset hover:bg-rs-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rs-gold"
            >
              <LoginOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('auth.login')}
            </a>
          )}
          <p className="mt-5 text-xs leading-relaxed text-rs-muted">{t('auth.identityNotice')}</p>
        </section>
      </div>
    </main>
  )
}
