import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CLAN_LINKS } from '../../../components/common/shell/links'
import { HomeSection } from './HomeSection'
import { BUTTON_LINK_CLASS, PRIMARY_LINK_CLASS } from './linkClasses'

const STEPS = ['profile', 'join', 'teams', 'drops'] as const

/** The bingo in four steps, login and the clan links (FR-006). */
export function HowItWorks({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useTranslation()
  return (
    <HomeSection id="home-how" title={t('homePage.how.title')}>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex gap-3 rounded-[3px] border border-rs-border/60 bg-rs-inset p-3"
          >
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-rs-border-strong font-display text-sm text-rs-gold-bright"
            >
              {index + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <strong className="text-sm text-rs-text">{t(`homePage.how.${step}.title`)}</strong>
              <span className="text-[13px] text-rs-muted">{t(`homePage.how.${step}.text`)}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!loggedIn && (
          <Link to="/login" className={PRIMARY_LINK_CLASS}>
            {t('auth.login')}
          </Link>
        )}
        <a
          href={CLAN_LINKS.discord}
          target="_blank"
          rel="noopener noreferrer"
          className={BUTTON_LINK_CLASS}
        >
          {t('footer.clanDiscord')}
        </a>
        <a
          href={CLAN_LINKS.site}
          target="_blank"
          rel="noopener noreferrer"
          className={BUTTON_LINK_CLASS}
        >
          {t('footer.clanSite')}
        </a>
      </div>
    </HomeSection>
  )
}
