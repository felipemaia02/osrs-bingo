import type { ReactNode } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import { Trans, useTranslation } from 'react-i18next'
import { EventRulesText } from '../../events/components/EventRulesText'
import { AGREEMENTS, type Agreement } from '../state'

const SUMMARY: Array<{ key: string; icon: ReactNode }> = [
  { key: 'board', icon: <GridViewOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: 'progress', icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: 'screenshots', icon: <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: 'teams', icon: <GroupsOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: 'buyIn', icon: <PaymentsOutlinedIcon sx={{ fontSize: 18 }} /> },
]

/** Step 3: fixed summary, the event's written rules and the 3 agreements (FR-004). */
export function RulesStep({
  rulesText,
  rsn,
  agreed,
  onAgree,
}: {
  rulesText: string | null
  rsn: string | null
  agreed: Record<Agreement, boolean>
  onAgree: (agreement: Agreement, value: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SUMMARY.map((item) => (
          <li key={item.key} className="flex gap-2.5 text-sm">
            <span className="mt-px text-rs-gold" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              <Trans i18nKey={`join.rules.summary.${item.key}`} components={{ b: <strong /> }} />
            </span>
          </li>
        ))}
      </ul>
      {rulesText && (
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-sm font-semibold text-rs-gold-bright">{t('join.rules.event')}</h3>
          <div className="rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2">
            <EventRulesText text={rulesText} collapsible={false} />
          </div>
        </div>
      )}
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t('join.rules.confirm')}</legend>
        {AGREEMENTS.map((agreement) => (
          <label
            key={agreement}
            className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5 text-sm"
          >
            <input
              type="checkbox"
              checked={agreed[agreement]}
              onChange={(event) => onAgree(agreement, event.target.checked)}
              className="m-0 mt-px size-[18px] shrink-0 accent-rs-gold"
            />
            <span>
              <Trans
                i18nKey={`join.rules.agreements.${agreement}`}
                values={{ rsn: rsn ?? t('join.rules.yourAccount') }}
                components={{ b: <strong /> }}
              />
            </span>
          </label>
        ))}
      </fieldset>
    </>
  )
}
