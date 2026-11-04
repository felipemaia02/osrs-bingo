import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { DropRow } from '../cardForm'
import { useWikiRates } from '../hooks/useCards'
import type { WikiDropRate } from '../types'

interface WikiRatesImportProps {
  cardName: string
  rows: DropRow[]
  onChange: (rows: DropRow[]) => void
}

/** "Import rates from the wiki": fills each drop's rate as the wiki writes it; when the wiki
 * has several sources for an item (e.g. raid modes), the admin picks one (060 rev 2). */
export function WikiRatesImport({ cardName, rows, onChange }: WikiRatesImportProps) {
  const { t } = useTranslation()
  const lookup = useWikiRates()
  const [pending, setPending] = useState<WikiDropRate[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [filled, setFilled] = useState<number | null>(null)
  const named = rows.filter((row) => row.name.trim())

  function setRate(name: string, rate: string, current: DropRow[] = rows) {
    onChange(current.map((row) => (row.name.trim() === name ? { ...row, dropRate: rate } : row)))
  }

  function importRates() {
    lookup.mutate(
      { card: cardName.trim(), items: named.map((row) => row.name.trim()) },
      {
        onSuccess: (rates) => {
          const found = new Map(
            rates.flatMap((item) => (item.rate ? [[item.name, item.rate] as const] : [])),
          )
          onChange(
            rows.map((row) => ({ ...row, dropRate: found.get(row.name.trim()) ?? row.dropRate })),
          )
          setFilled(found.size)
          setPending(rates.filter((item) => !item.rate && item.sources.length))
          setMissing(rates.filter((item) => !item.sources.length).map((item) => item.name))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span>
        <Button
          size="sm"
          disabled={lookup.isPending || !named.length || !cardName.trim()}
          onClick={importRates}
        >
          {t(lookup.isPending ? 'common.loading' : 'cards.drops.wikiImport')}
        </Button>
      </span>
      {lookup.isError && (
        <p role="alert" className="m-0 text-xs text-rs-danger-text">
          {t('cards.drops.wikiUnavailable')}
        </p>
      )}
      {filled !== null && (
        <p role="status" className="m-0 text-xs text-rs-muted">
          {t('cards.drops.wikiFilled', { count: filled })}
          {missing.length > 0 && ` ${t('cards.drops.wikiMissing', { names: missing.join(', ') })}`}
        </p>
      )}
      {pending.map((item) => (
        <div
          key={item.name}
          className="flex flex-wrap items-center gap-1.5 rounded-[3px] border border-rs-border/70 bg-rs-inset p-2 text-xs"
        >
          <span>{t('cards.drops.wikiPick', { name: item.name })}</span>
          {item.sources.map((source) => (
            <Button
              key={`${source.source}-${source.rarity}`}
              size="sm"
              onClick={() => {
                setRate(item.name, source.rarity)
                setPending((current) => current.filter((other) => other.name !== item.name))
              }}
            >
              {source.source}: {source.rarity}
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}
