import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { SubmissionCounts } from '../../submissions/types'
import { HomeSection } from './HomeSection'
import { BUTTON_LINK_CLASS, PRIMARY_LINK_CLASS } from './linkClasses'

/** What to do next: submit a drop, pending and rejected submissions, profile (FR-005). */
export function PlayerShortcuts({
  counts,
  canSubmit,
}: {
  counts: SubmissionCounts | null
  canSubmit: boolean
}) {
  const { t } = useTranslation()
  return (
    <HomeSection id="home-shortcuts" title={t('homePage.shortcuts.title')}>
      {counts && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
          <li>
            <Link to="/submissions" className="text-rs-gold-bright">
              {t('homePage.shortcuts.pending', { count: counts.pending })}
            </Link>
          </li>
          <li>
            <Link
              to="/submissions"
              className={counts.rejected ? 'text-rs-danger-text' : 'text-rs-gold-bright'}
            >
              {t('homePage.shortcuts.rejected', { count: counts.rejected })}
            </Link>
          </li>
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <Link to="/submissions" className={PRIMARY_LINK_CLASS}>
            <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('homePage.shortcuts.submit')}
          </Link>
        )}
        <Link to="/profile" className={BUTTON_LINK_CLASS}>
          <AccountCircleOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('navigation.profile')}
        </Link>
      </div>
    </HomeSection>
  )
}
