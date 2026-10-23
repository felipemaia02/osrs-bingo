import { useState, type FormEvent } from 'react'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import { eventErrorKey } from '../errors'
import type { BingoEvent, EventRules } from '../types'

const RULES_TEXT_MAX_LENGTH = 5000

interface EventRulesModalProps {
  event: BingoEvent
  saving: boolean
  onSave: (rules: EventRules) => Promise<void>
  onClose: () => void
}

/** The event's written rules (feature 019): plain text players read on Events and the board. */
export function EventRulesModal({ event, saving, onSave, onClose }: EventRulesModalProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(event.rules_text ?? '')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    setErrorKey(null)
    try {
      await onSave({ rules_text: text.trim() || null })
    } catch (error) {
      setErrorKey(eventErrorKey(error))
    }
  }

  return (
    <FormModal
      title={t('events.rules.title', { name: event.name })}
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={(submitEvent) => void submit(submitEvent)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('events.rules.text')}
          <textarea
            rows={12}
            maxLength={RULES_TEXT_MAX_LENGTH}
            value={text}
            onChange={(change) => setText(change.target.value)}
            placeholder={t('events.rules.placeholder')}
            className={`${FIELD_CLASS} resize-y py-2 font-normal`}
          />
        </label>
        <p className="m-0 text-xs text-rs-muted">{t('events.rules.hint')}</p>
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
