import { useTranslation } from 'react-i18next'

/** The administrator's written rules; line breaks are kept, nothing else is formatted. */
export function EventRulesText({
  text,
  collapsible = true,
}: {
  text: string
  collapsible?: boolean
}) {
  const { t } = useTranslation()
  const body = <p className="m-0 whitespace-pre-line text-[13px] leading-relaxed">{text}</p>
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
