import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { useSavePreferences } from '../hooks/useProfile'
import { browserTimezone } from '../timezones'
import { ACTIVITIES, type Activity, type Preferences } from '../types'
import { TimezonePicker } from './TimezonePicker'

/** Time zone and usual activity, saved on the profile (FR-006). */
export function ClanPreferences({ saved }: { saved: Preferences }) {
  const { t } = useTranslation()
  const save = useSavePreferences()
  // With nothing saved yet, the browser's zone is suggested (saved only on "Save").
  const [timezone, setTimezone] = useState<string | null>(saved.timezone ?? browserTimezone())
  const [activity, setActivity] = useState<Activity | null>(saved.activity)
  const changed = timezone !== saved.timezone || activity !== saved.activity

  return (
    <Panel as="section" aria-labelledby="profile-prefs-title" className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <h2
          id="profile-prefs-title"
          className="m-0 font-display text-lg font-bold text-rs-gold-bright"
        >
          {t('profile.preferences.title')}
        </h2>
        <span className="text-[13px] text-rs-muted">{t('profile.preferences.description')}</span>
      </div>
      <div className="flex flex-col gap-1">
        <TimezonePicker value={timezone} onChange={setTimezone} />
        {!saved.timezone && timezone && (
          <span className="text-[13px] text-rs-muted">{t('profile.preferences.detected')}</span>
        )}
      </div>
      <OptionGroup
        legend={t('profile.preferences.activity')}
        name="profile-activity"
        options={ACTIVITIES}
        value={activity}
        label={(value) => t(`profile.activities.${value}`)}
        onChange={setActivity}
      />
      <Button
        variant="primary"
        disabled={!changed || save.isPending}
        onClick={() => save.mutate({ timezone, activity })}
      >
        {t('profile.preferences.save')}
      </Button>
      {save.isSuccess && !changed && (
        <p role="status" className="m-0 text-[13px] text-rs-success-text">
          {t('profile.preferences.saved')}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="m-0 text-[13px] text-rs-danger-text">
          {t('common.apiError')}
        </p>
      )}
    </Panel>
  )
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  label,
  onChange,
}: {
  legend: string
  name: string
  options: readonly T[]
  value: T | null
  label: (value: T) => string
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-semibold">{legend}</legend>
      {options.map((option) => {
        const checked = option === value
        return (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 text-sm ${
              checked
                ? 'border-rs-gold-bright bg-rs-raised font-semibold text-rs-gold-bright'
                : 'border-rs-border bg-rs-inset'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option)}
              className="m-0 size-4 accent-rs-gold"
            />
            {label(option)}
          </label>
        )
      })}
    </fieldset>
  )
}
