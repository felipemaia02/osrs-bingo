import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { Trans, useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'

/** Step 4: the event's buy-in and its status (FR-005); admins mark it paid (feature 023). */
export function BuyInStep({ buyIn }: { buyIn: string | null }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5 text-sm">
      <PaymentsOutlinedIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {buyIn ? (
          <Trans
            i18nKey="join.buyIn.amount"
            values={{ amount: buyIn }}
            components={{ b: <strong /> }}
          />
        ) : (
          t('join.buyIn.none')
        )}
      </span>
      {buyIn && (
        <Badge tone="gold">
          <ScheduleOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
          {t('join.buyIn.notPaid')}
        </Badge>
      )}
    </div>
  )
}
