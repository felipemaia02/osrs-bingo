import { useTranslation } from 'react-i18next'
import type { Estimate } from '../../cards/types'

/** "≈ 528 kills · ≈ 13.2 h", with "—" for what isn't known (feature 060, BR-003). */
export function EstimateText({ estimate }: { estimate: Estimate }) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const kills = estimate.kills === null ? '—' : `≈ ${number.format(estimate.kills)}`
  const hours = estimate.hours === null ? '—' : `≈ ${number.format(estimate.hours)}`
  return (
    <span>
      {t('estimate.value', { kills, hours })}
      {estimate.drops_without_rate > 0 && (
        <span className="text-rs-muted">
          {' '}
          {t('estimate.withoutRate', { count: estimate.drops_without_rate })}
        </span>
      )}
    </span>
  )
}
