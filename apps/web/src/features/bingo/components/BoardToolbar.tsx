import GridViewIcon from '@mui/icons-material/GridView'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { useTranslation } from 'react-i18next'
import type { BoardView, TierFilter } from '../types'

const TIER_FILTERS: TierFilter[] = ['all', 'Low', 'Mid', 'High']

interface BoardToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  tier: TierFilter
  onTierChange: (tier: TierFilter) => void
  view: BoardView
  onViewChange: (view: BoardView) => void
  /** Number of matching tiles while filtering; null when no filter is active. */
  matchCount: number | null
}

export function BoardToolbar({
  search,
  onSearchChange,
  tier,
  onTierChange,
  view,
  onViewChange,
  matchCount,
}: BoardToolbarProps) {
  const { t } = useTranslation()
  const segment = (active: boolean) =>
    `rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rs-gold ${
      active ? 'bg-rs-gold/15 text-rs-gold-bright' : 'text-rs-muted hover:text-rs-text'
    }`

  return (
    <div className="space-y-2 border-b border-rs-border/50 bg-rs-inset/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{t('board.search.label')}</span>
          <SearchOutlinedIcon
            fontSize="small"
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-rs-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('board.search.placeholder')}
            className="w-full rounded-sm border border-rs-border bg-rs-inset py-2 pl-8 pr-2 text-sm text-rs-text placeholder:text-rs-muted"
          />
        </label>
        <div
          role="group"
          aria-label={t('board.filter.label')}
          className="flex rounded-sm border border-rs-border/60 bg-rs-inset p-0.5"
        >
          {TIER_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tier === option}
              onClick={() => onTierChange(option)}
              className={segment(tier === option)}
            >
              {option === 'all' ? t('board.filter.all') : t(`tile.tier.${option}`)}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label={t('board.view.label')}
          className="flex rounded-sm border border-rs-border/60 bg-rs-inset p-0.5"
        >
          <button
            type="button"
            aria-pressed={view === 'grid'}
            aria-label={t('board.view.grid')}
            title={t('board.view.grid')}
            onClick={() => onViewChange('grid')}
            className={segment(view === 'grid')}
          >
            {view === 'grid' ? (
              <GridViewIcon fontSize="small" aria-hidden="true" />
            ) : (
              <GridViewOutlinedIcon fontSize="small" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            aria-label={t('board.view.list')}
            title={t('board.view.list')}
            onClick={() => onViewChange('list')}
            className={segment(view === 'list')}
          >
            {view === 'list' ? (
              <ViewListIcon fontSize="small" aria-hidden="true" />
            ) : (
              <ViewListOutlinedIcon fontSize="small" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p role="status" className="min-h-4 text-xs text-rs-muted">
        {matchCount === null ? '' : t('board.search.results', { count: matchCount })}
      </p>
    </div>
  )
}
