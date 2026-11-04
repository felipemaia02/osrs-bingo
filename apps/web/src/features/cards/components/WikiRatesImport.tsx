import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { useWikiRatesImport } from '../hooks/useWikiRatesImport'

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
