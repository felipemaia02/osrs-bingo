import { useState } from 'react'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { ThemedMenu, ThemedMenuItem } from '../../../components/ui/ThemedMenu'
import { useLogout, useSession } from '../hooks/useSession'

/**
 * Account control: avatar (and username on desktop) opening a menu with "Log out",
 * or a "Log in" link for anonymous visitors.
 */
export function AuthControls({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const session = useSession()
  const logout = useLogout()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

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
        className={`inline-flex items-center rounded-[3px] border border-rs-border bg-rs-surface px-3.5 text-sm text-rs-text hover:border-rs-border-strong ${
          compact ? 'min-h-10' : 'min-h-9'
        }`}
      >
        {t('auth.login')}
      </Link>
    )

  const { username } = session.data
  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? 'account-menu' : undefined}
        aria-label={t('shell.account', { name: username })}
        className={
          compact
            ? 'inline-flex size-11 items-center justify-center rounded-[3px]'
            : 'inline-flex min-h-9 items-center gap-2 rounded-[3px] border border-rs-border bg-rs-surface px-3.5 text-sm text-rs-text hover:border-rs-border-strong'
        }
      >
        <Avatar name={username} size={compact ? 'md' : 'sm'} />
        {!compact && (
          <>
            <span className="max-w-40 truncate">{username}</span>
            <ExpandMoreOutlinedIcon fontSize="small" aria-hidden="true" />
          </>
        )}
      </button>
      <ThemedMenu id="account-menu" anchorEl={anchor} onClose={() => setAnchor(null)}>
        <ThemedMenuItem
          disabled={logout.isPending}
          onClick={() => {
            setAnchor(null)
            logout.mutate()
          }}
        >
          <LogoutOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('auth.logout')}
        </ThemedMenuItem>
      </ThemedMenu>
      {logout.isError && (
        <span role="alert" className="text-xs text-rs-muted">
          {t('common.apiError')}
        </span>
      )}
    </>
  )
}
