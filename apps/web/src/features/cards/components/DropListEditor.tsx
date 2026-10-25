import { useMemo, useState } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ContentPasteOutlinedIcon from '@mui/icons-material/ContentPasteOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { searchItems } from '../api/cardsApi'
import {
  dropsNeeded,
  isLinked,
  newDropRow,
  normalizeName,
  parsePastedDrops,
  toAcceptedDrops,
  type DropRow,
} from '../cardForm'
import { useDropMatchPreview } from '../hooks/useCards'
import type { DropMatchInput, ItemOption } from '../types'
import { ItemIcon, ItemPicker } from './ItemPicker'

const PREVIEW_DELAY_MS = 600
const SUMMARY_EXAMPLES = 3

interface DropListEditorProps {
  rows: DropRow[]
  onChange: (rows: DropRow[]) => void
  requirement: string
  points: string
}

/** Accepted drops as rows picked from OSRS items (feature 033). */
export function DropListEditor({ rows, onChange, requirement, points }: DropListEditorProps) {
  const { t } = useTranslation()
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [pasteNote, setPasteNote] = useState<string | null>(null)
  const [pasteBusy, setPasteBusy] = useState(false)
  const queryClient = useQueryClient()

  const update = (uid: string, changes: Partial<DropRow>) =>
    onChange(rows.map((row) => (row.uid === uid ? { ...row, ...changes } : row)))
  const remove = (uid: string) => {
    const left = rows.filter((row) => row.uid !== uid)
    onChange(left.length ? left : [newDropRow()])
  }
  const pick = (uid: string, option: ItemOption) =>
    update(uid, {
      name: option.label,
      itemIds: option.item_ids,
      matchByName: option.any_version,
      iconUrl: option.icon_url,
    })

  async function linkByName(name: string): Promise<ItemOption | null> {
    const text = name.trim()
    const result = await queryClient.fetchQuery({
      queryKey: ['osrs-items', text.toLocaleLowerCase()],
      queryFn: () => searchItems(text),
    })
    return (
      result.items.find(
        (option) => option.any_version && normalizeName(option.name) === normalizeName(text),
      ) ?? null
    )
  }

  async function applyPaste() {
    const lines = parsePastedDrops(pasted)
    if (!lines.length) return
    setPasteBusy(true)
    try {
      const found = await Promise.all(lines.map((line) => linkByName(line.name).catch(() => null)))
      const kept = rows.filter(
        (row) =>
          row.name.trim() &&
          !lines.some((line) => normalizeName(line.name) === normalizeName(row.name)),
      )
      const added = lines.map((line, index) => {
        const option = found[index]
        const existing = rows.find((row) => normalizeName(row.name) === normalizeName(line.name))
        return newDropRow({
          ...(existing ?? {}),
          uid: existing?.uid ?? newDropRow().uid,
          name: option?.label ?? line.name,
          itemIds: option?.item_ids ?? [],
          matchByName: true,
          iconUrl: option?.icon_url ?? null,
          weight: line.weight,
        })
      })
      onChange([...kept, ...added])
      const missing = found.filter((option) => !option).length
      setPasteNote(missing ? t('cards.drops.pasteMissing', { count: missing }) : null)
      setPasted('')
      setPasting(false)
    } finally {
      setPasteBusy(false)
    }
  }

  const examples = rows
    .filter((row) => row.name.trim())
    .map((row) => ({ name: row.name.trim(), needed: dropsNeeded(requirement, row.weight) }))
    .filter((item): item is { name: string; needed: number } => item.needed !== null)
    .slice(0, SUMMARY_EXAMPLES)

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold">{t('cards.drops.title')}</span>
        <Button size="sm" onClick={() => setPasting(!pasting)} aria-expanded={pasting}>
          <ContentPasteOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t('cards.drops.paste')}
        </Button>
      </div>
      {pasting && (
        <div className="flex flex-col gap-2 rounded-[3px] border border-rs-border bg-rs-inset p-3">
          <label className="flex flex-col gap-1 text-[13px]">
            {t('cards.drops.pasteHint')}
            <textarea
              rows={4}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder={"Hydra's claw | 3\nHydra's leather | 2"}
              className="min-h-20 resize-y rounded-[3px] border border-rs-border bg-rs-surface px-2.5 py-2 text-sm text-rs-text outline-none focus:border-rs-gold"
            />
          </label>
          <span className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={pasteBusy || !pasted.trim()}
              onClick={() => void applyPaste()}
            >
              {t(pasteBusy ? 'common.loading' : 'cards.drops.pasteApply')}
            </Button>
          </span>
        </div>
      )}
      {pasteNote && (
        <p role="status" className="m-0 text-xs text-rs-gold-bright">
          {pasteNote}
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row, index) => (
          <DropRowItem
            key={row.uid}
            row={row}
            position={index + 1}
            onType={(name) =>
              update(row.uid, { name, itemIds: [], matchByName: true, iconUrl: null })
            }
            onPick={(option) => pick(row.uid, option)}
            onWeight={(weight) => update(row.uid, { weight })}
            onRemove={() => remove(row.uid)}
          />
        ))}
      </ul>
      <span>
        <Button size="sm" onClick={() => onChange([...rows, newDropRow()])}>
          <AddOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t('cards.drops.add')}
        </Button>
      </span>
      {examples.length > 0 && Number(points) >= 0 && (
        <p className="m-0 text-xs text-rs-muted">
          {t('cards.drops.summary', { requirement, points })}{' '}
          {t('cards.drops.summaryExamples', {
            examples: examples
              .map((item) => t('cards.drops.example', { count: item.needed, name: item.name }))
              .join(t('cards.drops.or')),
          })}
        </p>
      )}
      <ClanDropCheck rows={rows} />
    </div>
  )
}

function DropRowItem({
  row,
  position,
  onType,
  onPick,
  onWeight,
  onRemove,
}: {
  row: DropRow
  position: number
  onType: (name: string) => void
  onPick: (option: ItemOption) => void
  onWeight: (weight: string) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const linked = isLinked(row)
  const named = row.name.trim()
  const label = named || t('cards.drops.unnamed', { position })
  return (
    <li className="flex flex-col gap-1.5 rounded-[3px] border border-rs-border/70 bg-rs-surface p-2 md:flex-row md:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <ItemIcon url={row.iconUrl} name={row.name} />
        <ItemPicker
          value={row.name}
          label={t('cards.drops.item', { position })}
          onType={onType}
          onPick={onPick}
        />
      </span>
      <span className="flex items-center gap-2">
        {named &&
          (linked ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-rs-success-text">
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
              {t('cards.drops.linked')}
            </span>
          ) : (
            <span
              title={t('cards.drops.manualHint')}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-rs-gold-bright"
            >
              <WarningAmberOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
              {t('cards.drops.manual')}
            </span>
          ))}
        <label className="flex items-center gap-1.5 text-xs text-rs-muted">
          {t('cards.drops.progress')}
          <input
            type="number"
            min="0.1"
            step="0.1"
            required
            aria-label={t('cards.drops.progressFor', { name: label })}
            value={row.weight}
            onChange={(event) => onWeight(event.target.value)}
            className="min-h-9 w-20 rounded-[3px] border border-rs-border bg-rs-inset px-2 text-sm text-rs-text outline-none focus:border-rs-gold"
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('cards.drops.remove', { name: label })}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[3px] border border-rs-border text-rs-text hover:bg-rs-raised"
        >
          <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
        </button>
      </span>
    </li>
  )
}

/** How many stored clan drops (DropTracker) these drops would have matched. */
function ClanDropCheck({ rows }: { rows: DropRow[] }) {
  const { t } = useTranslation()
  const drops: DropMatchInput[] = useMemo(
    () =>
      toAcceptedDrops(rows).map((drop) => ({
        name: drop.name,
        aliases: drop.aliases,
        item_ids: drop.item_ids ?? [],
        match_by_name: drop.match_by_name ?? true,
      })),
    [rows],
  )
  const settled = useDebouncedValue(drops, PREVIEW_DELAY_MS)
  const preview = useDropMatchPreview(settled)
  if (!settled.length || !preview.data) return null
  const { available, days, total, per_drop: perDrop } = preview.data
  if (!available)
    return <p className="m-0 text-xs text-rs-muted">{t('cards.drops.checkUnavailable')}</p>
  const missing = settled.filter((_, index) => !perDrop[index]).map((drop) => drop.name)
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-[3px] border border-rs-border/70 bg-rs-inset p-2.5 text-xs"
    >
      <span className={total ? 'text-rs-success-text' : 'text-rs-muted'}>
        {total
          ? t('cards.drops.checkTotal', { count: total, days })
          : t('cards.drops.checkNone', { days })}
      </span>
      {total > 0 && (
        <span className="text-rs-muted">
          {settled
            .map((drop, index) => ({ name: drop.name, count: perDrop[index] ?? 0 }))
            .filter((item) => item.count)
            .map((item) => t('cards.drops.example', { count: item.count, name: item.name }))
            .join(' · ')}
        </span>
      )}
      {missing.length > 0 && (
        <span className="text-rs-muted">
          {t('cards.drops.checkMissing', { names: missing.join(', ') })}
        </span>
      )}
    </div>
  )
}
