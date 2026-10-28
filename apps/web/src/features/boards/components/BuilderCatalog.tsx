import { CategorySelect } from '../../cards/components/CardCatalogToolbar'
import type { CategoryFilter } from '../../cards/hooks/useCatalogView'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CardImage } from '../../../components/ui/CardImage'
import type { BuilderCard } from '../hooks/useBuilderCards'
import type { CatalogMode, DifficultyFilter } from '../hooks/useCatalogFilter'
import type { DragSource } from '../types'

const DIFFICULTIES: DifficultyFilter[] = ['all', 'Low', 'Mid', 'High']

interface BuilderCatalogProps {
  activeCount: number
  retiredCount: number
  availableCount: number
  onBoardCount: number
  items: BuilderCard[]
  retired: BuilderCard[]
  mode: CatalogMode
  difficulty: DifficultyFilter
  query: string
  selectedKey: string | null
  editable: boolean
  canAdd: boolean
  drag: DragSource | null
  onModeChange: (mode: CatalogMode) => void
  onDifficultyChange: (difficulty: DifficultyFilter) => void
  /** Feature 040. */
  category: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  onQueryChange: (query: string) => void
  onSelect: (card: BuilderCard) => void
  onAdd: (card: BuilderCard) => void
  onDragChange: (drag: DragSource | null) => void
}

/** Catalog side panel (boards-a-desktop): filters, drop search, add and drag sources. */
export function BuilderCatalog(props: BuilderCatalogProps) {
  const { t } = useTranslation()
  const filterButton = (mode: CatalogMode, label: string) => (
    <Button
      size="sm"
      aria-pressed={props.mode === mode}
      onClick={() => props.onModeChange(mode)}
      className={props.mode === mode ? '!border-rs-gold !text-rs-gold-bright' : ''}
    >
      {label}
    </Button>
  )

  return (
    <section
      aria-label={t('boards.catalog')}
      className="flex flex-col overflow-hidden rounded border border-rs-border bg-rs-surface"
    >
      <div className="flex flex-col gap-2 border-b border-rs-border p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[17px] text-rs-gold-bright">
            {t('boards.catalogTitle')}
          </h2>
          <span className="text-xs text-rs-muted">
            {t('boards.catalogCounts', { active: props.activeCount, retired: props.retiredCount })}
          </span>
        </div>
        <label className="relative flex items-center">
          <SearchOutlinedIcon
            fontSize="small"
            className="pointer-events-none absolute left-2.5 text-rs-muted"
            aria-hidden="true"
          />
          <span className="sr-only">{t('boards.searchCardOrDrop')}</span>
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t('boards.searchCardOrDrop')}
            className="min-h-10 w-full rounded-[3px] border border-rs-border bg-rs-inset pl-[38px] pr-3 text-sm text-rs-text placeholder:text-rs-muted"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {filterButton('available', t('boards.filterAvailable', { count: props.availableCount }))}
          {filterButton('onBoard', t('boards.filterOnBoard', { count: props.onBoardCount }))}
          <label>
            <span className="sr-only">{t('boards.difficulty')}</span>
            <select
              value={props.difficulty}
              onChange={(event) => props.onDifficultyChange(event.target.value as DifficultyFilter)}
              className="min-h-[34px] rounded-[3px] border border-rs-border bg-rs-surface px-2.5 text-[13px] text-rs-text"
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? t('boards.allDifficulties') : t(`tile.tier.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <CategorySelect value={props.category} onChange={props.onCategoryChange} />
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {!props.items.length && !props.retired.length && (
          <p className="m-0 p-3 text-sm text-rs-muted">{t('boards.noResults')}</p>
        )}
        {props.items.map((card) => {
          const selected = card.key === props.selectedKey
          const dragging = props.drag?.kind === 'catalog' && props.drag.key === card.key
          const draggable = props.editable && props.canAdd && props.mode === 'available'
          return (
            <div
              key={card.key}
              draggable={draggable}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData('text/plain', card.name)
                props.onDragChange({ kind: 'catalog', key: card.key, name: card.name })
              }}
              onDragEnd={() => props.onDragChange(null)}
              className={`flex items-center gap-2.5 border-b border-rs-border/45 px-2.5 py-2 ${
                selected ? 'bg-rs-raised shadow-[inset_3px_0_0_theme(colors.rs.gold-bright)]' : ''
              } ${draggable ? 'cursor-grab' : ''}`}
            >
              <button
                type="button"
                onClick={() => props.onSelect(card)}
                aria-pressed={selected}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                {dragging ? (
                  <span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[3px] bg-rs-inset text-rs-border-strong">
                    <DragIndicatorOutlinedIcon aria-hidden="true" />
                  </span>
                ) : (
                  <CardImage
                    name={card.name}
                    imageUrl={card.imageUrl}
                    className="h-9 w-10 shrink-0"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <strong className="text-[13px]">{card.name}</strong>
                  {dragging && (
                    <Badge tone="neutral" className="ml-1">
                      {t('boards.dragging')}
                    </Badge>
                  )}
                  <br />
                  <span className="text-xs text-rs-muted">
                    {t('boards.cardMeta', {
                      tier: t(`tile.tier.${card.difficulty}`),
                      points: card.points,
                      requirement: card.requirement,
                      revision: card.revision,
                    })}
                  </span>
                </span>
              </button>
              {props.editable && props.mode === 'available' && (
                <Button
                  size="sm"
                  disabled={!props.canAdd}
                  aria-label={t('boards.addCard', { name: card.name })}
                  onClick={() => props.onAdd(card)}
                >
                  <AddOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
                </Button>
              )}
            </div>
          )
        })}
        {props.retired.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-2.5 border-b border-rs-border/45 px-2.5 py-2 opacity-60 last:border-b-0"
          >
            <span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[3px] bg-rs-inset text-rs-border-strong">
              <BlockOutlinedIcon aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="text-[13px]">{card.name}</strong>{' '}
              <Badge tone="danger-outline">{t('boards.retired')}</Badge>
              <br />
              <span className="text-xs text-rs-muted">{t('boards.retiredHint')}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
