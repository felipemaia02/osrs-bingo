import { useState } from 'react'
import type { DropRow } from '../cardForm'
import type { WikiDropRate } from '../types'
import { useWikiRates } from './useCards'

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
