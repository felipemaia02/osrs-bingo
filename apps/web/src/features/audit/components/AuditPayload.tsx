import { useTranslation } from 'react-i18next'

function display(value: unknown, empty: string): string {
  if (value === null || value === undefined || value === '') return empty
  if (Array.isArray(value))
    return value.length ? value.map((item) => display(item, empty)).join(', ') : empty
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** The fields the request sent, as "field: value". */
export function AuditPayload({ payload }: { payload: Record<string, unknown> }) {
  const { t } = useTranslation()
  const empty = t('audit.empty')
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
      {Object.entries(payload).map(([field, value]) => (
        <div key={field} className="contents">
          <dt className="font-semibold text-rs-muted">{field}</dt>
          <dd className="m-0 break-words">{display(value, empty)}</dd>
        </div>
      ))}
    </dl>
  )
}
