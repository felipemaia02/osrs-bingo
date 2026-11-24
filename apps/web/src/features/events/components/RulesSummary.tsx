import { Trans } from 'react-i18next'
import { ruleSummary } from '../ruleSummary'

/** The fixed rules as icon cards (feature 068). */
export function RulesSummaryCards({ hasBuyIn }: { hasBuyIn: boolean }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {ruleSummary(hasBuyIn).map((item) => (
        <li
          key={item.key}
          className="flex gap-3 rounded-[3px] border border-rs-border/60 bg-rs-inset p-3 text-sm"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-rs-border-strong text-rs-gold"
          >
            {item.icon}
          </span>
          <span className="self-center">
            <Trans i18nKey={`join.rules.summary.${item.key}`} components={{ b: <strong /> }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
