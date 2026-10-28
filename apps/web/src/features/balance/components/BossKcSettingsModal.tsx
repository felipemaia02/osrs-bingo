import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { bossLabel, useBossKcSettings, useSaveBossKcSettings } from '../hooks'

/** Admins choose bosses that don't count in boss KC totals (feature 039). */
export function BossKcSettingsModal({
  onSaved,
  onClose,
}: {
  onSaved: (message: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const settings = useBossKcSettings()
  const save = useSaveBossKcSettings()
  const [chosen, setChosen] = useState<Set<string> | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const excluded = chosen ?? new Set(settings.data?.excluded ?? [])
  const raids = new Set(settings.data?.raids ?? [])
  const bosses = (settings.data?.known ?? []).filter((boss) =>
    bossLabel(boss).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )

  function toggle(boss: string) {
    const next = new Set(excluded)
    if (next.has(boss)) next.delete(boss)
    else next.add(boss)
    setChosen(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(false)
    try {
      await save.mutateAsync([...excluded])
      onSaved(t('balance.settings.saved'))
    } catch {
      setError(true)
    }
  }

  return (
    <FormModal title={t('balance.settings.title')} busy={save.isPending} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <p className="m-0 text-[13px] text-rs-muted">{t('balance.settings.hint')}</p>
        <input
          type="search"
          value={query}
          onChange={(change) => setQuery(change.target.value)}
          aria-label={t('balance.settings.search')}
          placeholder={t('balance.settings.search')}
          className="min-h-10 rounded-[3px] border border-rs-border bg-rs-inset px-3 text-sm text-rs-text outline-none focus:border-rs-gold"
        />
        {settings.isLoading ? (
          <p className="m-0 text-sm text-rs-muted">{t('common.loading')}</p>
        ) : (
          <ul className="m-0 grid max-h-80 list-none gap-1 overflow-y-auto p-0 sm:grid-cols-2">
            {bosses.map((boss) => (
              <li key={boss}>
                <label className="flex items-center gap-2 rounded-[3px] px-2 py-1 text-[13px] hover:bg-rs-raised">
                  <input
                    type="checkbox"
                    checked={excluded.has(boss)}
                    onChange={() => toggle(boss)}
                    className="accent-rs-gold"
                  />
                  {bossLabel(boss)}
                  {raids.has(boss) && (
                    <span className="text-xs text-rs-muted">· {t('balance.raid')}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t('common.apiError')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={save.isPending || !settings.data}>
            {t(save.isPending ? 'common.saving' : 'balance.settings.save')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
