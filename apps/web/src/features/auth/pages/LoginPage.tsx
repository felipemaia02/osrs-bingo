import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LanguageMenuButton, LanguageSwitcher } from '../../../components/common/LanguageSwitcher'
import { Wordmark } from '../../../components/common/shell/Wordmark'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { discordLoginUrl } from '../api/authApi'
import { useSession } from '../hooks/useSession'

const SHIELD_SRC = '/branding/osrs-bingo-shield.png'

/** Layout v2 login (no mockup): shell brand bar plus a branded Discord login panel. */
export function LoginPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const session = useSession()
  const [search] = useSearchParams()
  const loginError = search.get('login')

  if (session.data) return <Navigate to={session.data.is_admin ? '/admin' : '/events'} replace />

  return (
    <div className="flex min-h-screen flex-col bg-rs-canvas text-rs-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rs-border bg-rs-inset pl-4 pr-3 md:h-16 md:px-6">
        <Wordmark compact={!isDesktop} />
        {isDesktop ? <LanguageSwitcher /> : <LanguageMenuButton />}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
        <section
          aria-labelledby="login-title"
          className="flex w-full max-w-[440px] flex-col gap-4 rounded border border-rs-border bg-rs-surface p-6 shadow-rs-panel md:p-8"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={SHIELD_SRC} alt="" className="h-16 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
              {t('auth.loginEyebrow')}
            </span>
            <h1
              id="login-title"
              className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]"
            >
              {t('auth.loginTitle')}
            </h1>
            <p className="m-0 text-rs-muted">{t('auth.loginDescription')}</p>
          </div>
          {loginError && (
            <p
              role="alert"
              className="m-0 rounded-sm border border-rs-danger bg-rs-danger-bg p-3 text-sm text-rs-danger-text"
            >
              {t(loginError === 'unavailable' ? 'auth.notConfigured' : 'auth.loginFailed')}
            </p>
          )}
          {session.isLoading ? (
            <p role="status" className="m-0 text-center text-sm text-rs-muted">
              {t('common.loading')}
            </p>
          ) : session.isError ? (
            <div className="flex flex-col gap-3">
              <p role="alert" className="m-0 text-sm text-rs-muted">
                {t('common.apiError')}
              </p>
              <Button className="w-full" onClick={() => void session.refetch()}>
                {t('auth.retry')}
              </Button>
            </div>
          ) : (
            <a
              href={discordLoginUrl}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-rs-gold bg-rs-gold px-3.5 text-sm font-semibold text-rs-canvas hover:bg-rs-gold-bright"
            >
              <LoginOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('auth.login')}
            </a>
          )}
          <InfoBanner>
            <span className="text-[13px]">{t('auth.identityNotice')}</span>
          </InfoBanner>
        </section>
        <Link
          to="/events"
          className="inline-flex min-h-11 items-center gap-0.5 text-[13px] text-rs-gold-bright hover:text-rs-gold-hover"
        >
          <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          {t('auth.backToEvents')}
        </Link>
      </main>
    </div>
  )
}
