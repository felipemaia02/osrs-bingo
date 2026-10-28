import { useTranslation } from 'react-i18next'
import type { RulesAddendum } from '../types'

/**
 * The administrator's written rules; line breaks are kept, nothing else is formatted.
 * Clarifications added during the event (feature 036) follow, each with its date.
 */
export function EventRulesText({
  text,
  addenda = [],
  collapsible = true,
}: {
  text: string | null
  addenda?: RulesAddendum[]
  collapsible?: boolean
}) {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const body = (
    <div className="flex flex-col gap-2">
      {text && <p className="m-0 whitespace-pre-line text-[13px] leading-relaxed">{text}</p>}
      {addenda.length > 0 && (
        <ul
          aria-label={t('events.rules.clarifications')}
          className="m-0 flex list-none flex-col gap-1.5 p-0"
        >
          {addenda.map((addendum) => (
            <li
              key={addendum.added_at}
              className="rounded-[3px] border-l-2 border-rs-gold bg-rs-warning-bg px-2.5 py-1.5 text-[13px]"
            >
              <strong className="text-xs text-rs-gold-bright">
                {t('events.rules.clarificationOn', {
                  date: date.format(new Date(addendum.added_at)),
                })}
              </strong>
              <p className="m-0 whitespace-pre-line leading-relaxed">{addendum.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
  if (!collapsible) return body
  return (
    <details className="rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2">
      <summary className="min-h-8 cursor-pointer text-[13px] font-semibold text-rs-gold-bright">
        {t('events.rules.section')}
      </summary>
      <div className="pt-2">{body}</div>
    </details>
  )
}
