import { useTranslation } from 'react-i18next'
import { normalizeSearch } from '../../../lib/text/search'
import type { TierFilter } from '../types'

export interface FilterSummary {
  /** "5 tiles accept "claw"", "2 Hard tiles accept "jar"" or "11 Hard tiles". */
  matched: string
  /** "the other 31 stay in place, dimmed.", empty when nothing is dimmed. */
  rest: string
  /** Short form for the mobile mini-map: "7 accept "jar"" or "11 Hard". */
  short: string
}

/** Text describing the current search/filter result; null when nothing is filtered. */
export function useFilterSummary(
  matchCount: number | null,
  total: number,
  search: string,
  tier: TierFilter,
): FilterSummary | null {
  const { t } = useTranslation()
  if (matchCount === null) return null
  const query = search.trim()
  const hasQuery = normalizeSearch(query) !== ''
  const tierName = tier === 'all' ? '' : t(`tile.tier.${tier}`)
  const key = hasQuery ? (tierName ? 'searchTier' : 'search') : 'tier'
  const values = { count: matchCount, query, tier: tierName }
  const dimmed = total - matchCount
  return {
    matched: t(`board.status.${key}`, values),
    rest: dimmed > 0 ? t('board.status.rest', { count: dimmed }) : '',
    short: t(`board.status.short.${hasQuery ? 'search' : 'tier'}`, values),
  }
}
