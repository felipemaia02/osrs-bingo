import { useState, type DragEvent } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import MoveDownOutlinedIcon from '@mui/icons-material/MoveDownOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { CardImage } from '../../../components/ui/CardImage'
import { TIER_TONE } from '../../bingo/tierTone'
import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import { axisOf, bonusPositionsOf, positionsOf, rowOf, type Draft } from '../draft'
import { gridColumns, sameCellWidth } from '../gridStyle'
import type { BuilderCard } from '../hooks/useBuilderCards'
import { usePositionLabel } from '../hooks/usePositionLabel'
import { BonusRowControls } from './BonusRowControls'
import type { DragSource } from '../types'

const AXIS_PX = 18
const GAP_PX = 8

interface BuilderGridProps {
  draft: Draft
  size: number
  bonusSlots: number
  onBonusSlotsChange: (slots: number) => void
  cardFor: (key: string | undefined) => BuilderCard | null
  editable: boolean
  selectedPosition: number | null
  drag: DragSource | null
  onDragChange: (drag: DragSource | null) => void
  onSelectPosition: (position: number) => void
  onRemove: (position: number) => void
  onDrop: (position: number) => void
}

/** size×size builder grid (boards-a-desktop): filled slots can move/swap, empty slots accept cards. */
export function BuilderGrid({
  draft,
  size,
  bonusSlots,
  onBonusSlotsChange,
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
  const label = usePositionLabel(size)
  const axisNumbers = axisOf(size)
  const grid = gridColumns(AXIS_PX, size)
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

  function renderCell(position: number, bonus: boolean) {
    const card = cardFor(draft[position])
    const selected = position === selectedPosition
    const outline = selected ? 'outline outline-2 outline-offset-2 outline-rs-gold-bright' : ''
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
          className={`flex h-[108px] flex-col items-center justify-center gap-1 rounded border border-dashed bg-rs-inset text-xs text-rs-muted ${
            bonus ? 'border-rs-gold' : 'border-rs-border-strong'
          } ${outline}`}
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
            : bonus
              ? 'border-rs-gold'
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
            <Badge tone={TIER_TONE[card.difficulty]}>{t(`tile.tier.${card.difficulty}`)}</Badge>
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
  }

  return (
    <section
      aria-label={t('boards.gridLabel', { size })}
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      <div className="flex flex-col gap-2" style={sameCellWidth(AXIS_PX, GAP_PX, size)}>
        <div className="grid gap-2" style={grid} aria-hidden="true">
          <span />
          {axisNumbers.map((col) => (
            <span key={col} className={axis}>
              {col}
            </span>
          ))}
        </div>
        {axisNumbers.map((row) => (
          <div key={row} className="grid gap-2" style={grid}>
            <span className={`${axis} self-center`} aria-hidden="true">
              {row}
            </span>
            {positionsOf(size)
              .filter((position) => rowOf(position, size) === row)
              .map((position) => renderCell(position, false))}
          </div>
        ))}
        {bonusSlots > 0 && (
          <div
            role="group"
            aria-label={t('boards.bonusRow.label')}
            className="mt-2 grid gap-2 border-t border-dashed border-rs-gold/60 pt-3"
            style={grid}
          >
            <span
              className="self-center text-center text-rs-gold"
              title={t('boards.bonusRow.label')}
            >
              <StarOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
            </span>
            {bonusPositionsOf(size, bonusSlots).map((position) => renderCell(position, true))}
          </div>
        )}
      </div>
      <div style={sameCellWidth(AXIS_PX, GAP_PX, size)} className="flex flex-col">
        <BonusRowControls
          slots={bonusSlots}
          max={size}
          editable={editable}
          onChange={onBonusSlotsChange}
        />
      </div>
    </section>
  )
}
