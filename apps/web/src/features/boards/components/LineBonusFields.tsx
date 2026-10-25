import { useTranslation } from 'react-i18next'
import type { LineBonuses } from '../hooks/useBoardDraft'

const LINE_BONUS_MAX = 1000
const LINES: Array<keyof LineBonuses> = ['row', 'column']

interface LineBonusFieldsProps {
  bonuses: LineBonuses
  editable: boolean
  onChange: (line: keyof LineBonuses, value: number | null) => void
}

/** Row and column bonuses next to the board size (feature 019); required before activation. */
export function LineBonusFields({ bonuses, editable, onChange }: LineBonusFieldsProps) {
  const { t } = useTranslation()
  if (!editable)
    return (
      <span className="text-[13px] text-rs-muted">
        {t('boards.bonuses.readOnly', {
          row: bonuses.row ?? t('score.notConfiguredShort'),
          column: bonuses.column ?? t('score.notConfiguredShort'),
        })}
      </span>
    )
  return (
    <div className="flex flex-wrap items-center gap-3">
      {LINES.map((line) => (
        <label key={line} className="flex items-center gap-2 text-[13px] text-rs-muted">
          {t(`boards.bonuses.${line}`)}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={LINE_BONUS_MAX}
            step={1}
            value={bonuses[line] ?? ''}
            placeholder="—"
            onChange={(change) =>
              onChange(line, change.target.value === '' ? null : Number(change.target.value))
            }
            className={`min-h-11 w-20 rounded-[3px] border bg-rs-inset px-2 text-base text-rs-text md:min-h-[38px] md:text-sm ${
              bonuses[line] === null ? 'border-rs-border-strong' : 'border-rs-border'
            }`}
          />
        </label>
      ))}
      {(bonuses.row === null || bonuses.column === null) && (
        <span className="text-xs text-rs-gold-bright">{t('boards.bonuses.required')}</span>
      )}
    </div>
  )
}
