import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const STEPS = ['main', 'alts', 'timezone', 'activity'] as const

/** First login (feature 074): what to fill in before joining the bingo. */
export function WelcomeBanner() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="profile-welcome"
      className="flex flex-col gap-2 rounded border border-rs-gold bg-rs-raised p-4"
    >
      <h2
        id="profile-welcome"
        className="m-0 flex items-center gap-2 font-display text-lg text-rs-gold-bright"
      >
        <CelebrationOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('profile.welcome.title')}
      </h2>
      <p className="m-0 text-sm">{t('profile.welcome.text')}</p>
      <ol className="m-0 flex flex-col gap-1 pl-5 text-sm">
        {STEPS.map((step) => (
          <li key={step}>{t(`profile.welcome.steps.${step}`)}</li>
        ))}
      </ol>
      <Link
        to="/"
        className="self-start text-sm font-semibold text-rs-gold-bright underline underline-offset-2"
      >
        {t('profile.welcome.done')}
      </Link>
    </section>
  )
}
