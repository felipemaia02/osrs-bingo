import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import type { ProgressionTier, TierInfo } from '../tier'

const TIER_TONE: Record<ProgressionTier, BadgeTone> = {
  early: 'info',
  mid: 'gold',
  end: 'success',
}

/** "Early game" / "Mid game" / "End game", always as text (feature 069). */
export function TierBadge({ tier }: { tier: ProgressionTier | null | undefined }) {
  const { t } = useTranslation()
  if (!tier) return <Badge tone="neutral">{t('tier.unknown')}</Badge>
  return <Badge tone={TIER_TONE[tier]}>{t(`tier.${tier}`)}</Badge>
}

/** Admin view: the effective tier and, when an admin changed it, what WOM suggests (069). */
export function TierWithSuggestion({ info }: { info: TierInfo }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <TierBadge tier={info.tier} />
      {info.tier_overridden && (
        <span className="text-[11px] text-rs-muted">
          {t('tier.womSuggests', { tier: t(`tier.${info.tier_suggested ?? 'unknown'}`) })}
        </span>
      )}
    </span>
  )
}
