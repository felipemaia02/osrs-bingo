import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthControls } from '../../features/auth/components/AuthControls'
import { useSession } from '../../features/auth/hooks/useSession'
import { ActiveEventStatus } from '../../features/events/components/ActiveEventStatus'
import { usePendingReviews } from '../../features/submissions/hooks/usePendingReviews'
import { useDraftRegistrationCounts } from '../../features/teams/hooks/useDraftRegistrationCounts'
import { isNetworkError } from '../../lib/api'
import { LanguageMenuButton, LanguageSwitcher } from './LanguageSwitcher'
import { OfflineScreen } from './status/StatusScreens'
import { MobileBottomBar } from './shell/MobileBottomBar'
import { ShellSidebar } from './shell/ShellSidebar'
import { Wordmark } from './shell/Wordmark'

interface AppShellProps {
  children: ReactNode
  /** Desktop content padding from the page's mockup (they differ per screen). */
  desktopPadding?: string
}

const DEFAULT_DESKTOP_PADDING = 'md:px-10 md:pt-7'

/** Layout v2 shell 4A: docs/design/mockups/shell-a-desktop and shell-a-mobile. */
export function AppShell({ children, desktopPadding = DEFAULT_DESKTOP_PADDING }: AppShellProps) {
  const { t } = useTranslation()
  const session = useSession()
  const isAdmin = session.data?.is_admin === true
  const registrations = useDraftRegistrationCounts(isAdmin)
  const pendingReviews = usePendingReviews(isAdmin)

  return (
    <div className="min-h-screen bg-rs-canvas text-rs-text">
      <header className="sticky top-0 z-30 border-b border-rs-border bg-rs-inset">
        <div className="hidden h-16 items-center gap-4 px-6 md:flex">
          <Wordmark />
          <div className="ml-auto flex min-w-0 items-center gap-3.5">
            <ActiveEventStatus variant="pill" />
            <LanguageSwitcher />
            <AuthControls />
          </div>
        </div>
        <div className="flex h-14 items-center gap-2 pl-4 pr-3 md:hidden">
          <Wordmark compact />
          <div className="ml-auto flex items-center gap-1">
            <LanguageMenuButton />
            <AuthControls compact />
          </div>
        </div>
      </header>
      <div className="md:hidden">
        <ActiveEventStatus variant="bar" />
      </div>

      <div className="md:flex">
        <ShellSidebar
          isAdmin={isAdmin}
          pendingRegistrations={registrations?.pending ?? null}
          pendingReviews={pendingReviews}
        />
        <main
          aria-label={t('shell.main')}
          className={`min-w-0 flex-1 px-4 pb-[90px] pt-4 md:pb-8 ${desktopPadding}`}
        >
          {/* Nothing works without the server: say so once instead of every section failing. */}
          {session.isError && isNetworkError(session.error) ? (
            <OfflineScreen onRetry={() => void session.refetch()} />
          ) : (
            children
          )}
        </main>
      </div>

      <MobileBottomBar isAdmin={isAdmin} />
    </div>
  )
}
