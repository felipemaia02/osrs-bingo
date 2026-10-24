import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import { useTranslation } from 'react-i18next'
import { initialsOf } from '../../../lib/text/initials'
import type { CardDifficulty } from '../../cards/types'
import {
  axisOf,
  bonusIndexOf,
  bonusPositionsOf,
  emptyPositions,
  positionsOf,
  rowOf,
  type Draft,
} from '../draft'
import { gridColumns } from '../gridStyle'
import type { BuilderCard } from '../hooks/useBuilderCards'
import { usePositionLabel } from '../hooks/usePositionLabel'
import { BonusRowControls } from './BonusRowControls'

const AXIS_PX = 14
const LETTER_COLOR: Record<CardDifficulty, string> = {
  Low: 'text-rs-success-text',
  Mid: 'text-rs-gold-bright',
  High: 'text-rs-danger-text',
}

interface MobilePositionMapProps {
  draft: Draft
  size: number
  bonusSlots: number
  onBonusSlotsChange: (slots: number) => void
  cardFor: (key: string | undefined) => BuilderCard | null
  current: number | null
  editable: boolean
  onTap: (position: number) => void
}

/** Step 1 of the mobile flow (boards-b-mobile): pick a position on the map or the bonus row. */
export function MobilePositionMap({
  draft,
  size,
  bonusSlots,
  onBonusSlotsChange,
  cardFor,
  current,
  editable,
  onTap,
}: MobilePositionMapProps) {
  const { t } = useTranslation()
  const label = usePositionLabel(size)
  const axisNumbers = axisOf(size)
  const grid = gridColumns(AXIS_PX, size)
  const axis = 'text-center text-[11px] font-semibold text-rs-muted'

  function renderCell(position: number, bonus: boolean) {
    const card = cardFor(draft[position])
    const isCurrent = position === current
    const short = bonus ? `★${bonusIndexOf(position, size)}` : label(position)
    const base =
      'flex h-12 min-w-0 flex-col items-center justify-center rounded-[3px] border p-0 text-[11px] font-bold leading-[1.15]'
    const style = isCurrent
      ? 'border-rs-gold-bright bg-rs-gold-bright text-rs-canvas outline outline-2 outline-offset-2 outline-rs-gold-bright'
      : card
        ? `${bonus ? 'border-rs-gold' : 'border-rs-border'} bg-rs-surface text-rs-text`
        : `border-dashed ${bonus ? 'border-rs-gold' : 'border-rs-border-strong'} bg-rs-inset text-rs-muted`
    return (
      <button
        key={position}
        type="button"
        disabled={!editable}
        onClick={() => onTap(position)}
        aria-pressed={isCurrent}
        aria-label={
          card
            ? t('boards.filledSlot', {
                position: label(position),
                name: card.name,
                tier: t(`tile.tier.${card.difficulty}`),
              })
            : t('boards.emptySlot', { position: label(position) })
        }
        className={`${base} ${style}`}
      >
        <span>{isCurrent ? short : card ? initialsOf(card.name) : '+'}</span>
        <span
          className={`text-[10px] font-semibold ${
            isCurrent ? '' : card ? LETTER_COLOR[card.difficulty] : 'text-rs-muted'
          }`}
        >
          {isCurrent
            ? t('boards.mobile.here')
            : card
              ? t(`tile.tierLetter.${card.difficulty}`)
              : short}
        </span>
      </button>
    )
  }

  return (
    <section
      aria-label={t('boards.mobile.step1')}
      className="flex flex-col gap-[5px] rounded border border-rs-border bg-rs-surface p-2.5"
    >
      <div className="flex items-baseline justify-between">
        <strong className="text-[13px]">{t('boards.mobile.step1')}</strong>
        <span className="text-xs text-rs-muted">
          {t('boards.mobile.empty', {
            count: emptyPositions(draft, size, bonusSlots).length,
          })}
        </span>
      </div>
      <div className="grid gap-1" style={grid} aria-hidden="true">
        <span />
        {axisNumbers.map((col) => (
          <span key={col} className={axis}>
            {col}
          </span>
        ))}
      </div>
      {axisNumbers.map((row) => (
        <div key={row} className="grid gap-1" style={grid}>
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
          className="mt-1 grid gap-1 border-t border-dashed border-rs-gold/60 pt-2"
          style={grid}
        >
          <span className="self-center text-center text-rs-gold">
            <StarOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          </span>
          {bonusPositionsOf(size, bonusSlots).map((position) => renderCell(position, true))}
        </div>
      )}
      <BonusRowControls
        slots={bonusSlots}
        max={size}
        editable={editable}
        onChange={onBonusSlotsChange}
      />
      <span className="text-[11px] text-rs-muted">{t('boards.mobile.legend')}</span>
    </section>
  )
}
