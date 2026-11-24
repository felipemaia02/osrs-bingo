import { useTranslation } from 'react-i18next'
import { LEGEND_SHADES } from '../progressShade'

/** What the map/matrix shades mean (077). */
export function ProgressLegend() {
  const { t } = useTranslation()
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-rs-muted">
      {(['none', 'partial', 'complete'] as const).map((state) => (
        <li key={state} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`flex size-3.5 items-center justify-center rounded-[2px] border text-[9px] ${LEGEND_SHADES[state]}`}
          >
            {state === 'complete' ? '✓' : ''}
          </span>
          {t(`dashboard.legend.${state}`)}
        </li>
      ))}
    </ul>
  )
}
