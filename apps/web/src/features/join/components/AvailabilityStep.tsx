import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ACTIVITIES, type Activity, type Member } from '../../profiles/types'
import { TeammatePicker } from './TeammatePicker'

/** Step 2: activity for this event, the profile's time zone and preferred teammates (FR-003). */
export function AvailabilityStep({
  activity,
  timezone,
  teammates,
  onActivityChange,
  onTeammatesChange,
}: {
  activity: Activity | null
  timezone: string | null
  teammates: Member[]
  onActivityChange: (activity: Activity) => void
  onTeammatesChange: (teammates: Member[]) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">
          {t('join.activity.label')}{' '}
          <span className="font-normal text-rs-muted">{t('join.activity.fromProfile')}</span>
        </legend>
        <div className="flex flex-col gap-1.5 md:flex-row">
          {ACTIVITIES.map((option) => {
            const checked = option === activity
            return (
              <label
                key={option}
                className={`flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 text-sm ${
                  checked
                    ? 'border-rs-gold-bright bg-rs-raised font-semibold text-rs-gold-bright'
                    : 'border-rs-border bg-rs-inset'
                }`}
              >
                <input
                  type="radio"
                  name="join-activity"
                  checked={checked}
                  onChange={() => onActivityChange(option)}
                  className="m-0 size-4 accent-rs-gold"
                />
                {t(`join.activity.options.${option}`)}
              </label>
            )
          })}
        </div>
      </fieldset>
      <span className="flex flex-wrap items-center gap-1.5 text-sm">
        <PublicOutlinedIcon fontSize="small" className="text-rs-muted" aria-hidden="true" />
        {t('join.timezone')} <strong>{timezone ?? t('profile.preferences.noTimezone')}</strong>
        <span className="text-rs-muted">
          · {t('join.changeIn')}{' '}
          <Link to="/profile" className="text-rs-gold-bright">
            {t('navigation.profile')}
          </Link>
        </span>
      </span>
      <TeammatePicker value={teammates} onChange={onTeammatesChange} />
    </>
  )
}
