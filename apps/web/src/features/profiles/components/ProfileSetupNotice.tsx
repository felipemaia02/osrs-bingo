import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import type { Profile } from '../types'

const PROFILE_PATH = '/profile'
const DISMISSED_KEY = 'profile-setup-notice-dismissed'

type Missing = 'both' | 'rsn' | 'timezone'

function missingSetup(profile: Profile): Missing | null {
  const noRsn = profile.accounts.length === 0
  const noTimezone = !profile.timezone
  if (noRsn && noTimezone) return 'both'
  if (noRsn) return 'rsn'
  if (noTimezone) return 'timezone'
  return null
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function saveDismissed(): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Without storage the notice just comes back on the next page load.
  }
}

/** Asks signed-in players to link an RSN and pick a time zone (feature 046). */
export function ProfileSetupNotice() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const session = useSession()
  const profile = useProfile(Boolean(session.data))
  const [dismissed, setDismissed] = useState(readDismissed)
  const missing = profile.data ? missingSetup(profile.data) : null
  if (!missing || dismissed || pathname === PROFILE_PATH) return null

  const dismiss = () => {
    saveDismissed()
    setDismissed(true)
  }

  return (
    <section
      aria-label={t('profile.setup.title')}
      className="mb-4 flex flex-col gap-2.5 rounded border border-rs-border-strong bg-rs-surface px-3.5 py-3 md:flex-row md:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <ManageAccountsOutlinedIcon className="text-rs-gold" aria-hidden="true" />
        <div className="flex flex-col">
          <strong className="text-rs-gold-bright">{t('profile.setup.title')}</strong>
          <span className="text-[13px] text-rs-muted">{t(`profile.setup.${missing}`)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={PROFILE_PATH}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[3px] border border-rs-gold bg-rs-gold px-3.5 text-sm font-semibold text-rs-canvas hover:bg-rs-gold-bright md:min-h-10 md:flex-none"
        >
          {t('profile.setup.action')}
        </Link>
        <button
          type="button"
          aria-label={t('profile.setup.dismiss')}
          onClick={dismiss}
          className="inline-flex size-11 items-center justify-center rounded-[3px] border border-transparent text-rs-muted hover:bg-rs-raised hover:text-rs-text md:size-[34px]"
        >
          <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
