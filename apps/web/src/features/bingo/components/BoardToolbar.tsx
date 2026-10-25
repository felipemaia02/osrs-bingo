import { useState } from 'react'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import FilterCenterFocusOutlinedIcon from '@mui/icons-material/FilterCenterFocusOutlined'
import GridView from '@mui/icons-material/GridView'
import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ViewList from '@mui/icons-material/ViewList'
import ViewListOutlined from '@mui/icons-material/ViewListOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import type { FilterSummary } from '../hooks/useFilterSummary'
import { useTierOptions } from '../hooks/useTierOptions'
import type { BoardView, TierFilter } from '../types'

export function SearchField({
  value,
  onChange,
  mobile = false,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  mobile?: boolean
  autoFocus?: boolean
}) {
  const { t } = useTranslation()
  return (
    <label className={`relative flex min-w-0 items-center ${mobile ? '' : 'flex-1 basis-72'}`}>
      <SearchOutlinedIcon
        fontSize="small"
        className="pointer-events-none absolute left-2.5 text-rs-muted"
        aria-hidden="true"
      />
      <span className="sr-only">{t('board.search.label')}</span>
      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('board.search.placeholder')}
        className={`w-full rounded-[3px] border border-rs-border bg-rs-inset pl-[38px] pr-3 text-rs-text placeholder:text-rs-muted ${
          mobile ? 'min-h-11 text-base' : 'min-h-10 text-sm'
        }`}
      />
    </label>
  )
}

interface BoardToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  tier: TierFilter
  onTierChange: (tier: TierFilter) => void
  view: BoardView
  onViewChange: (view: BoardView) => void
  onHelp: () => void
  summary: FilterSummary | null
}

/** Desktop toolbar (board-a-desktop): search, difficulty, view, help and the result line. */
export function BoardToolbar({
  search,
  onSearchChange,
  tier,
  onTierChange,
  view,
  onViewChange,
  onHelp,
  summary,
}: BoardToolbarProps) {
  const { t } = useTranslation()
  const tierOptions = useTierOptions()
  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-rs-border bg-rs-surface p-3">
      <SearchField value={search} onChange={onSearchChange} />
      <SegmentedControl
        label={t('board.filter.label')}
        options={tierOptions}
        value={tier}
        onChange={onTierChange}
      />
      <SegmentedControl
        label={t('board.view.label')}
        value={view}
        onChange={onViewChange}
        options={[
          {
            value: 'grid',
            ariaLabel: t('board.view.grid'),
            label:
              view === 'grid' ? (
                <GridView fontSize="small" />
              ) : (
                <GridViewOutlined fontSize="small" />
              ),
          },
          {
            value: 'list',
            ariaLabel: t('board.view.list'),
            label:
              view === 'list' ? (
                <ViewList fontSize="small" />
              ) : (
                <ViewListOutlined fontSize="small" />
              ),
          },
        ]}
      />
      <button
        type="button"
        onClick={onHelp}
        className="inline-flex min-h-10 items-center gap-2 rounded-[3px] border border-rs-border bg-rs-surface px-3.5 text-sm text-rs-text hover:border-rs-border-strong"
      >
        <HelpOutlineOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('board.help.title')}
      </button>
      <div role="status" className="flex w-full items-center gap-1.5 text-[13px]">
        {summary && (
          <>
            <FilterCenterFocusOutlinedIcon
              sx={{ fontSize: 18 }}
              className="text-rs-gold-bright"
              aria-hidden="true"
            />
            <strong>{summary.matched}</strong>
            {summary.rest && ' '}
            {summary.rest && <span className="text-rs-muted">{summary.rest}</span>}
          </>
        )}
      </div>
    </div>
  )
}

/** Mobile: the search stays behind a button until needed (feature 026, FR-003). */
export function MobileSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(Boolean(value))
  if (!open)
    return (
      <Button className="self-start" onClick={() => setOpen(true)}>
        <SearchOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('board.search.open')}
      </Button>
    )
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SearchField value={value} onChange={onChange} mobile autoFocus />
      </div>
      <Button
        size="icon"
        aria-label={t('board.search.close')}
        onClick={() => {
          onChange('')
          setOpen(false)
        }}
      >
        <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
      </Button>
    </div>
  )
}
