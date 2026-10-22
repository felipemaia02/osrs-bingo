import { useTranslation } from 'react-i18next'
import type { SegmentOption } from '../../../components/ui/SegmentedControl'
import type { TierFilter } from '../types'

const TIER_FILTERS: TierFilter[] = ['all', 'Low', 'Mid', 'High']

/** All / Easy / Medium / Hard options for the difficulty filter. */
export function useTierOptions(): Array<SegmentOption<TierFilter>> {
  const { t } = useTranslation()
  return TIER_FILTERS.map((value) => ({
    value,
    label: value === 'all' ? t('board.filter.all') : t(`tile.tier.${value}`),
  }))
}
