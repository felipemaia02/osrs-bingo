import { useState, type DragEvent } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import MoveDownOutlinedIcon from '@mui/icons-material/MoveDownOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { CardImage } from '../../../components/ui/CardImage'
import { TIER_TONE } from '../../bingo/tierTone'
import { columnOf, POSITIONS, rowOf, type Draft } from '../draft'
import type { BuilderCard } from '../hooks/useBuilderCards'
import type { DragSource } from '../types'

const AXIS = [1, 2, 3, 4, 5, 6]
const GRID = 'grid grid-cols-[18px_repeat(6,minmax(0,1fr))] gap-2'

interface BuilderGridProps {
  draft: Draft
  cardFor: (key: string | undefined) => BuilderCard | null
  editable: boolean
  selectedPosition: number | null
  drag: DragSource | null
  onDragChange: (drag: DragSource | null) => void
  onSelectPosition: (position: number) => void
  onRemove: (position: number) => void
  onDrop: (position: number) => void
}

/** 6×6 builder grid (boards-a-desktop): filled slots can move/swap, empty slots accept cards. */
export function BuilderGrid({
  draft,
  cardFor,
  editable,
  selectedPosition,
  drag,
  onDragChange,
  onSelectPosition,
  onRemove,
  onDrop,
}: BuilderGridProps) {
  const { t } = useTranslation()
  const [over, setOver] = useState<number | null>(null)
  const label = (position: number) => `${rowOf(position)}·${columnOf(position)}`
  const axis = 'text-center text-xs font-semibold text-rs-muted'

  function dropHandlers(position: number) {
    return {
      onDragOver: (event: DragEvent) => {
        if (!editable || !drag) return
        event.preventDefault()
        setOver(position)
      },
      onDragLeave: () => setOver((current) => (current === position ? null : current)),
      onDrop: (event: DragEvent) => {
        event.preventDefault()
        setOver(null)
        onDrop(position)
      },
    }
  }

  return (
    <section aria-label={t('boards.gridLabel')} className="flex min-w-0 flex-1 flex-col gap-2">
      <div className={GRID} aria-hidden="true">
        <span />
        {AXIS.map((col) => (
          <span key={col} className={axis}>
            {col}
          </span>
        ))}
      </div>
      {AXIS.map((row) => (
        <div key={row} className={GRID}>
          <span className={`${axis} self-center`} aria-hidden="true">
            {row}
          </span>
          {POSITIONS.filter((position) => rowOf(position) === row).map((position) => {
            const card = cardFor(draft[position])
            const selected = position === selectedPosition
            const outline = selected
              ? 'outline outline-2 outline-offset-2 outline-rs-gold-bright'
              : ''
            if (drag?.kind === 'catalog' && over === position && !card) {
              return (
                <div
                  key={position}
                  {...dropHandlers(position)}
                  aria-live="polite"
                  className="flex h-[108px] flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-rs-gold-bright bg-rs-raised text-center text-xs font-semibold text-rs-gold-bright"
                >
                  <MoveDownOutlinedIcon fontSize="small" aria-hidden="true" />
                  {t('boards.dropOn', { name: drag.name, position: label(position) })}
                </div>
              )
            }
            if (!card) {
              return (
                <button
                  key={position}
                  type="button"
                  disabled={!editable}
                  {...dropHandlers(position)}
                  onClick={() => onSelectPosition(position)}
                  aria-label={t('boards.emptySlot', { position: label(position) })}
                  aria-pressed={selected}
                  className={`flex h-[108px] flex-col items-center justify-center gap-1 rounded border border-dashed border-rs-border-strong bg-rs-inset text-xs text-rs-muted ${outline}`}
                >
                  <AddOutlinedIcon fontSize="small" aria-hidden="true" />
                  {t('boards.emptyShort', { position: label(position) })}
                </button>
              )
            }
            return (
              <div
                key={position}
                draggable={editable}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', card.name)
                  onDragChange({ kind: 'slot', position, name: card.name })
                }}
                onDragEnd={() => onDragChange(null)}
                {...dropHandlers(position)}
                className={`relative h-[108px] min-w-0 rounded border bg-rs-surface ${
                  over === position && drag?.kind === 'slot'
                    ? 'border-rs-gold-bright'
                    : 'border-rs-border'
                } ${editable ? 'cursor-grab' : ''} ${outline}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPosition(position)}
                  aria-pressed={selected}
                  aria-label={t('boards.filledSlot', {
                    position: label(position),
                    name: card.name,
                    tier: t(`tile.tier.${card.difficulty}`),
                  })}
                  className="flex size-full flex-col gap-1 p-1.5 text-left"
                >
                  <CardImage name={card.name} imageUrl={card.imageUrl} className="h-11 w-full" />
                  <span className="truncate text-xs font-semibold leading-tight">{card.name}</span>
                  <span className="flex items-center justify-between">
                    <Badge tone={TIER_TONE[card.difficulty]}>
                      {t(`tile.tier.${card.difficulty}`)}
                    </Badge>
                    <span className="text-xs font-semibold">
                      {t('tile.points', { count: card.points })}
                    </span>
                  </span>
                </button>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onRemove(position)}
                    aria-label={t('boards.removeFrom', { name: card.name })}
                    title={t('boards.removeFrom', { name: card.name })}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-[3px] border border-rs-border bg-rs-surface text-rs-text"
                  >
                    <CloseOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
