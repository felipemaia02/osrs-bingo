import { useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { EstimateText } from '../../scoring/components/EstimateText'
import type { EstimateInput } from '../api/cardsApi'
import { positiveOrNull, type CardForm } from '../cardForm'
import { useEhbRates, useEstimatePreview, useMatchEhbRate } from '../hooks/useCards'
import type { EhbRate } from '../types'

const PREVIEW_DELAY_MS = 400
const NOT_FOUND = 404

interface TimeEstimateEditorProps {
  form: CardForm
  onChange: (changes: Pick<CardForm, 'ehbBoss' | 'killsPerHour'>) => void
}

/** Kills per hour (typed, or found on Wise Old Man) and the live estimate (060 rev 1). */
export function TimeEstimateEditor({ form, onChange }: TimeEstimateEditorProps) {
  const { t } = useTranslation()
  const match = useMatchEhbRate()
  // The WOM list is only needed when the card's name isn't a WOM boss.
  const [picking, setPicking] = useState(false)
  const rates = useEhbRates(picking)
  const [source, setSource] = useState<EhbRate | null>(null)
  const notFound = match.error instanceof AxiosError && match.error.response?.status === NOT_FOUND
  const input = useMemo<EstimateInput | null>(() => {
    const requirement = positiveOrNull(form.requirement)
    const drops = form.drops.flatMap((row) => {
      const weight = positiveOrNull(row.weight)
      return weight === null
        ? []
        : [{ progress_weight: weight, drop_rate: row.dropRate.trim() || null }]
    })
    if (requirement === null || !drops.length) return null
    return {
      completion_requirement: requirement,
      drops,
      kills_per_hour: positiveOrNull(form.killsPerHour),
    }
  }, [form.requirement, form.drops, form.killsPerHour])
  const preview = useEstimatePreview(useDebouncedValue(input, PREVIEW_DELAY_MS))

  function use(rate: EhbRate) {
    setSource(rate)
    setPicking(false)
    onChange({ ehbBoss: rate.boss, killsPerHour: String(rate.suggested_kills_per_hour) })
  }

  function findOnWom() {
    setSource(null)
    match.mutate(form.name, {
      onSuccess: use,
      onError: (error) =>
        setPicking(error instanceof AxiosError && error.response?.status === NOT_FOUND),
    })
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 md:col-span-2">
      <legend className="mb-1 p-0 text-[13px] font-semibold">{t('estimate.title')}</legend>
      <label className="flex flex-col gap-1 text-[13px] font-semibold">
        {t('estimate.killsPerHour')}
        <span className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="any"
            value={form.killsPerHour}
            // A typed value is the admin's own: it no longer comes from a WOM boss.
            onChange={(event) => {
              setSource(null)
              onChange({ ehbBoss: '', killsPerHour: event.target.value })
            }}
            className={`${FIELD_CLASS} min-w-0 flex-1 font-normal`}
          />
          <Button disabled={match.isPending || !form.name.trim()} onClick={findOnWom}>
            {t('estimate.findOnWom')}
          </Button>
        </span>
      </label>
      {source ? (
        <span role="status" className="text-xs text-rs-muted">
          {t('estimate.fromWom', {
            name: source.label,
            rate: source.ironman_kills_per_hour,
            suggested: source.suggested_kills_per_hour,
          })}
        </span>
      ) : (
        form.ehbBoss && (
          <span className="text-xs text-rs-muted">
            {t('estimate.fromWomBoss', { name: form.ehbBoss.replace(/_/g, ' ') })}
          </span>
        )
      )}
      {notFound && (
        <span role="status" className="text-xs text-rs-gold-bright">
          {t('estimate.notFound', { name: form.name })}
        </span>
      )}
      {match.isError && !notFound && (
        <span role="alert" className="text-xs text-rs-danger-text">
          {t('estimate.ratesUnavailable')}
        </span>
      )}
      {picking && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('estimate.pickBoss')}
          <select
            value=""
            disabled={!rates.data}
            onChange={(event) => {
              const rate = rates.data?.find((item) => item.boss === event.target.value)
              if (rate) use(rate)
            }}
            className={`${FIELD_CLASS} font-normal`}
          >
            <option value="">{t('estimate.noBoss')}</option>
            {rates.data?.map((rate) => (
              <option key={rate.boss} value={rate.boss}>
                {t('estimate.bossOption', { name: rate.label, rate: rate.ironman_kills_per_hour })}
              </option>
            ))}
          </select>
        </label>
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
