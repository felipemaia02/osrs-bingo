import { useState, type FormEvent } from 'react'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { eventErrorKey } from '../errors'
import type { BingoEvent, EventRules } from '../types'

const LINE_BONUS_MAX = 1000

interface EventRulesModalProps {
  event: BingoEvent
  saving: boolean
  onSave: (rules: EventRules) => Promise<void>
  onClose: () => void
}

/** Row and column bonuses of one draft event (future-rules, without special bonuses). */
export function EventRulesModal({ event, saving, onSave, onClose }: EventRulesModalProps) {
  const { t } = useTranslation()
  const [row, setRow] = useState(event.row_bonus?.toString() ?? '')
  const [column, setColumn] = useState(event.column_bonus?.toString() ?? '')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    setErrorKey(null)
    try {
      await onSave({ row_bonus: Number(row), column_bonus: Number(column) })
    } catch (error) {
      setErrorKey(eventErrorKey(error))
    }
  }

  const field = (label: string, value: string, change: (value: string) => void) => (
    <label className="flex flex-1 flex-col gap-1 text-[13px] font-semibold">
      {label}
      <input
        required
        type="number"
        inputMode="numeric"
        min={0}
        max={LINE_BONUS_MAX}
        step={1}
        value={value}
        onChange={(input) => change(input.target.value)}
        className={`${FIELD_CLASS} font-normal`}
      />
    </label>
  )

  return (
    <FormModal
      title={t('events.rules.title', { name: event.name })}
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={(submitEvent) => void submit(submitEvent)} className="flex flex-col gap-4">
        <h3 className="m-0 font-display text-base text-rs-gold-bright">
          {t('events.rules.lines')}
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          {field(t('events.rules.row'), row, setRow)}
          {field(t('events.rules.column'), column, setColumn)}
        </div>
        <p className="m-0 text-[13px] text-rs-muted">{t('events.rules.linesHint')}</p>
        <InfoBanner>
          <span className="text-[13px]">{t('events.rules.formula')}</span>
        </InfoBanner>
        {errorKey && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t(errorKey)}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-rs-muted">{t('events.rules.editableUntil')}</span>
          <span className="flex gap-2">
            <Button onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
              {t(saving ? 'common.saving' : 'events.rules.save')}
            </Button>
          </span>
        </div>
      </form>
    </FormModal>
  )
}
