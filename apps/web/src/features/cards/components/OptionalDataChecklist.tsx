import { useTranslation } from 'react-i18next'
import { hasEstimateValues, hasRateValues, type CardForm } from '../cardForm'

type OptionalData = Pick<CardForm, 'hasDropRates' | 'hasTimeEstimate'>

/** Whether the card has drop rates and a time estimate (feature 075). */
export function OptionalDataChecklist({
  form,
  onChange,
}: {
  form: CardForm
  onChange: (changes: Partial<OptionalData>) => void
}) {
  const { t } = useTranslation()
  const boxes: Array<{ key: keyof OptionalData; label: string; dropping: boolean }> = [
    {
      key: 'hasDropRates',
      label: t('cards.optional.dropRates'),
      dropping: !form.hasDropRates && hasRateValues(form),
    },
    {
      key: 'hasTimeEstimate',
      label: t('cards.optional.timeEstimate'),
      dropping: !form.hasTimeEstimate && hasEstimateValues(form),
    },
  ]
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0 md:col-span-2">
      <legend className="mb-1 p-0 text-[13px] font-semibold">{t('cards.optional.title')}</legend>
      {boxes.map((box) => (
        <div key={box.key} className="flex flex-col gap-0.5">
          <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form[box.key]}
              onChange={(event) => onChange({ [box.key]: event.target.checked })}
              className="size-4 accent-rs-gold"
            />
            {box.label}
          </label>
          {box.dropping && (
            <span role="status" className="pl-6 text-xs text-rs-danger-text">
              {t('cards.optional.removedOnSave')}
            </span>
          )}
        </div>
      ))}
    </fieldset>
  )
}
