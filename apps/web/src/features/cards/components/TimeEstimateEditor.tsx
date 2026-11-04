import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { EstimateText } from '../../scoring/components/EstimateText'
import type { EstimateInput } from '../api/cardsApi'
import { positiveOrNull, type CardForm } from '../cardForm'
import { useEhbRates, useEstimatePreview } from '../hooks/useCards'

const PREVIEW_DELAY_MS = 400

interface TimeEstimateEditorProps {
  form: CardForm
  onChange: (changes: Pick<CardForm, 'ehbBoss' | 'killsPerHour'>) => void
}

/** Boss from WOM's EHB rates, kills per hour and the live estimate (feature 060). */
export function TimeEstimateEditor({ form, onChange }: TimeEstimateEditorProps) {
  const { t } = useTranslation()
  const rates = useEhbRates()
  const input = useMemo<EstimateInput | null>(() => {
    const requirement = positiveOrNull(form.requirement)
    const drops = form.drops
      .map((row) => ({
        progress_weight: positiveOrNull(row.weight),
        drop_rate: positiveOrNull(row.dropRate),
      }))
      .filter((drop): drop is EstimateInput['drops'][number] => drop.progress_weight !== null)
    if (requirement === null || !drops.length) return null
    return {
      completion_requirement: requirement,
      drops,
      kills_per_hour: positiveOrNull(form.killsPerHour),
    }
  }, [form.requirement, form.drops, form.killsPerHour])
  const preview = useEstimatePreview(useDebouncedValue(input, PREVIEW_DELAY_MS))

  function pickBoss(boss: string) {
    const rate = rates.data?.find((item) => item.boss === boss)
    onChange({
      ehbBoss: boss,
      killsPerHour: rate ? String(rate.suggested_kills_per_hour) : form.killsPerHour,
    })
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 md:col-span-2">
      <legend className="mb-1 p-0 text-[13px] font-semibold">{t('estimate.title')}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('estimate.boss')}
          <select
            value={form.ehbBoss}
            onChange={(event) => pickBoss(event.target.value)}
            disabled={!rates.data}
            className={FIELD_CLASS}
          >
            <option value="">{t('estimate.noBoss')}</option>
            {rates.data?.map((rate) => (
              <option key={rate.boss} value={rate.boss}>
                {t('estimate.bossOption', {
                  name: rate.label,
                  rate: rate.ironman_kills_per_hour,
                })}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t('estimate.killsPerHour')}
            <input
              type="number"
              min="0.1"
              step="any"
              aria-describedby="kills-per-hour-hint"
              value={form.killsPerHour}
              onChange={(event) =>
                onChange({ ehbBoss: form.ehbBoss, killsPerHour: event.target.value })
              }
              className={FIELD_CLASS}
            />
          </label>
          <span id="kills-per-hour-hint" className="text-xs text-rs-muted">
            {t('estimate.suggestion')}
          </span>
        </div>
      </div>
      {rates.isError && (
        <span role="alert" className="text-xs text-rs-danger-text">
          {t('estimate.ratesUnavailable')}
        </span>
      )}
      {preview.data && (
        <p
          role="status"
          className="m-0 rounded-[3px] border border-rs-border/70 bg-rs-inset px-2.5 py-2 text-[13px]"
        >
          {t('estimate.fullTile')} <EstimateText estimate={preview.data} />
        </p>
      )}
      <p className="m-0 text-xs text-rs-muted">{t('estimate.disclaimer')}</p>
    </fieldset>
  )
}
