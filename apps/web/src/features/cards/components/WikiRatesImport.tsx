import { useState } from 'react'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { DropRow } from '../cardForm'
import { useWikiRates } from '../hooks/useCards'
import type { WikiDropRate } from '../types'

/** "Import rates from the wiki": fills each drop's rate as the wiki writes it; when the wiki
 * has several sources for an item (e.g. raid modes), the admin picks one (060 rev 2). */
export function useWikiRatesImport(
  cardName: string,
  rows: DropRow[],
  onChange: (rows: DropRow[]) => void,
) {
  const lookup = useWikiRates()
  const [pending, setPending] = useState<WikiDropRate[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [filled, setFilled] = useState<number | null>(null)
  const named = rows.filter((row) => row.name.trim())

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

  function pick(name: string, rate: string) {
    onChange(rows.map((row) => (row.name.trim() === name ? { ...row, dropRate: rate } : row)))
    setPending((current) => current.filter((item) => item.name !== name))
  }

  return {
    importRates,
    pick,
    busy: lookup.isPending,
    disabled: lookup.isPending || !named.length || !cardName.trim(),
    failed: lookup.isError,
    filled,
    missing,
    pending,
  }
}

type WikiImport = ReturnType<typeof useWikiRatesImport>

export function WikiRatesButton({ wiki }: { wiki: WikiImport }) {
  const { t } = useTranslation()
  return (
    <Button size="sm" disabled={wiki.disabled} onClick={wiki.importRates}>
      <MenuBookOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
      {t(wiki.busy ? 'common.loading' : 'cards.drops.wikiImport')}
    </Button>
  )
}

/** What the import did: how many were filled, what the wiki lacks, and sources to pick from. */
export function WikiRatesResult({ wiki }: { wiki: WikiImport }) {
  const { t } = useTranslation()
  return (
    <>
      {wiki.failed && (
        <p role="alert" className="m-0 text-xs text-rs-danger-text">
          {t('cards.drops.wikiUnavailable')}
        </p>
      )}
      {wiki.filled !== null && (
        <p role="status" className="m-0 text-xs text-rs-muted">
          {t('cards.drops.wikiFilled', { count: wiki.filled })}
          {wiki.missing.length > 0 &&
            ` ${t('cards.drops.wikiMissing', { names: wiki.missing.join(', ') })}`}
        </p>
      )}
      {wiki.pending.map((item) => (
        <div
          key={item.name}
          className="flex flex-wrap items-center gap-1.5 rounded-[3px] border border-rs-border/70 bg-rs-inset p-2 text-xs"
        >
          <span>{t('cards.drops.wikiPick', { name: item.name })}</span>
          {item.sources.map((source) => (
            <Button
              key={`${source.source}-${source.rarity}`}
              size="sm"
              onClick={() => wiki.pick(item.name, source.rarity)}
            >
              {source.source}: {source.rarity}
            </Button>
          ))}
        </div>
      ))}
    </>
  )
}
