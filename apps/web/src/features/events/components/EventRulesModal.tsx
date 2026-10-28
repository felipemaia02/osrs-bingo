import { useState, type FormEvent } from 'react'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import { eventErrorKey } from '../errors'
import type { BingoEvent, EventRules } from '../types'
import { hasRules } from '../rules'
import { EventRulesText } from './EventRulesText'

const RULES_TEXT_MAX_LENGTH = 5000

interface EventRulesModalProps {
  event: BingoEvent
  saving: boolean
  onSave: (rules: EventRules) => Promise<void>
  /** Active events (feature 036): the rules are frozen; clarifications are added instead. */
  onAddAddendum?: (text: string) => Promise<void>
  onClose: () => void
}

const ADDENDUM_MAX_LENGTH = 1000

/** The event's written rules (feature 019): plain text players read on Events and the board. */
export function EventRulesModal({
  event,
  saving,
  onSave,
  onAddAddendum,
  onClose,
}: EventRulesModalProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(event.rules_text ?? '')
  const [addendum, setAddendum] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const live = event.status === 'active'

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    setErrorKey(null)
    try {
      if (live) await onAddAddendum?.(addendum.trim())
      else await onSave({ rules_text: text.trim() || null })
    } catch (error) {
      setErrorKey(eventErrorKey(error))
    }
  }

  if (live)
    return (
      <FormModal
        title={t('events.rules.title', { name: event.name })}
        busy={saving}
        onClose={onClose}
      >
        <form onSubmit={(submitEvent) => void submit(submitEvent)} className="flex flex-col gap-3">
          {hasRules(event) ? (
            <div className="max-h-64 overflow-y-auto rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2">
              <EventRulesText
                text={event.rules_text ?? null}
                addenda={event.rules_addenda}
                collapsible={false}
              />
            </div>
          ) : (
            <p className="m-0 text-[13px] text-rs-muted">{t('events.rules.none')}</p>
          )}
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t('events.rules.addClarification')}
            <textarea
              required
              rows={4}
              maxLength={ADDENDUM_MAX_LENGTH}
              value={addendum}
              onChange={(change) => setAddendum(change.target.value)}
              placeholder={t('events.rules.clarificationPlaceholder')}
              className={`${FIELD_CLASS} resize-y py-2 font-normal`}
            />
          </label>
          <p className="m-0 text-xs text-rs-muted">{t('events.rules.clarificationHint')}</p>
          {errorKey && (
            <p
              role="alert"
              className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
            >
              {t(errorKey)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !addendum.trim()}>
              <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
              {t(saving ? 'common.saving' : 'events.rules.addClarificationAction')}
            </Button>
          </div>
        </form>
      </FormModal>
    )

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
