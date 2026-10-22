import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const SHIELD_SRC = '/branding/osrs-bingo-shield.png'

/** Logo shield plus the stacked "OSRS / Bingo" wordmark, linking to the board. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      aria-label={t('shell.home')}
      className="flex shrink-0 items-center gap-2.5 rounded-[3px] no-underline"
    >
      <img src={SHIELD_SRC} alt="" className={compact ? 'h-8 w-auto' : 'h-10 w-auto'} />
      <span
        className={`font-display font-bold leading-[.95] text-rs-gold-bright ${
          compact ? 'text-base' : 'text-[19px]'
        }`}
      >
        OSRS
        <br />
        Bingo
      </span>
    </Link>
  )
}
