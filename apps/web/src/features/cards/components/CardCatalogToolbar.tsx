import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { STATUS_FILTERS, type DifficultyFilter, type StatusFilter } from '../hooks/useCatalogView'

interface CardCatalogToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  status: StatusFilter
  onStatusChange: (value: StatusFilter) => void
  difficulty: DifficultyFilter
  onDifficultyChange: (value: DifficultyFilter) => void
  counts: Record<StatusFilter, number>
  resultCount: number
  mobile: boolean
}

const DIFFICULTIES: DifficultyFilter[] = ['all', 'Low', 'Mid', 'High']

/** Search, status and difficulty filters with the result line (local filtering only). */
export function CardCatalogToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  difficulty,
  onDifficultyChange,
  counts,
  resultCount,
  mobile,
}: CardCatalogToolbarProps) {
  const { t } = useTranslation()
  const variant = mobile ? 'chip' : 'segment'
  return (
    <div
      className={
        mobile
          ? 'flex flex-col gap-2.5'
          : 'flex flex-wrap items-center gap-3 rounded border border-rs-border bg-rs-surface p-3'
      }
    >
      <label className={`relative flex min-w-0 items-center ${mobile ? '' : 'flex-1 basis-64'}`}>
        <SearchOutlinedIcon
          fontSize="small"
          className="pointer-events-none absolute left-2.5 text-rs-muted"
          aria-hidden="true"
        />
        <span className="sr-only">{t('cards.search.label')}</span>
        <input
          type="search"
          value={query}
          onChange={(change) => onQueryChange(change.target.value)}
          placeholder={t('cards.search.placeholder')}
          className="min-h-11 w-full rounded-[3px] border border-rs-border bg-rs-inset pl-[38px] pr-3 text-base text-rs-text placeholder:text-rs-muted md:min-h-10 md:text-sm"
        />
      </label>
      <SegmentedControl<StatusFilter>
        label={t('cards.filter.status')}
        variant={variant}
        value={status}
        onChange={onStatusChange}
        options={STATUS_FILTERS.map((value) => ({
          value,
          label: t(`cards.filter.${value}`, { count: counts[value] }),
        }))}
      />
      <SegmentedControl<DifficultyFilter>
        label={t('cards.filter.difficulty')}
        variant={variant}
        value={difficulty}
        onChange={onDifficultyChange}
        options={DIFFICULTIES.map((value) => ({
          value,
          label: value === 'all' ? t('cards.filter.allDifficulties') : t(`tile.tier.${value}`),
        }))}
      />
      <span role="status" className="text-[13px] text-rs-muted">
        {t('cards.results', { count: resultCount })}
      </span>
    </div>
  )
}
