import { useTranslation } from 'react-i18next'
import { CLAN_LINKS, CREDIT_LINKS } from './links'

const CLAN_LOGO_SRC = '/branding/astralstar-logo.png'

const LINK_CLASS = 'text-rs-gold-bright no-underline hover:text-rs-gold-hover hover:underline'

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
    </a>
  )
}

/** Clan credit, links and the Jagex disclaimer at the end of every page (feature 051). */
export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  return (
    <footer
      aria-label={t('footer.label')}
      className="mt-10 flex flex-col gap-3 border-t border-rs-border/60 pt-5 text-xs text-rs-muted md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <img src={CLAN_LOGO_SRC} alt={t('footer.logoAlt')} className="h-9 w-9 shrink-0" />
        <span className="flex flex-col gap-0.5">
          <span className="text-rs-text">
            {t('footer.credit')} · © {year}
          </span>
          <span>{t('footer.disclaimer')}</span>
        </span>
      </div>
      <nav aria-label={t('footer.links')}>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
          <li>
            <ExternalLink href={CLAN_LINKS.site}>{t('footer.clanSite')}</ExternalLink>
          </li>
          <li>
            <ExternalLink href={CLAN_LINKS.discord}>{t('footer.clanDiscord')}</ExternalLink>
          </li>
          <li>
            <ExternalLink href={CREDIT_LINKS.osrsWiki}>{t('footer.osrsWiki')}</ExternalLink>
          </li>
          <li>
            <ExternalLink href={CREDIT_LINKS.wiseOldMan}>{t('footer.wiseOldMan')}</ExternalLink>
          </li>
        </ul>
      </nav>
    </footer>
  )
}
