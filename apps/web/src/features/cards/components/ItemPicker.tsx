import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { ITEM_SEARCH_MIN_LENGTH, useItemSearch } from '../hooks/useCards'
import type { ItemOption } from '../types'

const SEARCH_DELAY_MS = 250

export function ItemIcon({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-rs-border/60 bg-rs-inset">
      {url ? (
        <img src={url} alt="" loading="lazy" className="max-h-6 max-w-6 object-contain" />
      ) : (
        <span aria-hidden="true" className="text-[10px] font-bold text-rs-muted">
          {name.slice(0, 2).toUpperCase() || '?'}
        </span>
      )}
    </span>
  )
}

/**
 * Item search for a card drop (feature 033): typing searches the OSRS item list; picking a
 * result links the drop to its item IDs. Text left without a pick stays a free-text drop.
 */
export function ItemPicker({
  value,
  label,
  onType,
  onPick,
}: {
  value: string
  label: string
  onType: (text: string) => void
  onPick: (option: ItemOption) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const listId = `${id}-list`
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const term = useDebouncedValue(value, SEARCH_DELAY_MS)
  const results = useItemSearch(term)
  const options = results.data?.items ?? []
  const open = focused && value.trim().length >= ITEM_SEARCH_MIN_LENGTH

  const pick = (option: ItemOption) => {
    onPick(option)
    setFocused(false)
    setActive(0)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setFocused(false)
      return
    }
    if (!open || !options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(options[Math.min(active, options.length - 1)])
    }
  }

  const status =
    results.isLoading || term !== value
      ? t('common.loading')
      : results.isError
        ? t('common.apiError')
        : results.data && !results.data.ready
          ? t('cards.drops.notReady')
          : t('cards.drops.noResults')

  return (
    <div className="relative min-w-0 flex-1">
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? `${listId}-${active}` : undefined}
        value={value}
        placeholder={t('cards.drops.searchPlaceholder')}
        onChange={(event) => {
          onType(event.target.value)
          setFocused(true)
          setActive(0)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        className="min-h-9 w-full rounded-[3px] border border-rs-border bg-rs-inset px-2.5 text-sm text-rs-text outline-none placeholder:text-rs-muted focus:border-rs-gold"
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('cards.drops.results')}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded border border-rs-border/70 bg-rs-surface py-1 shadow-rs-panel"
        >
          {options.length && term === value ? (
            options.map((option, index) => (
              <div
                key={`${option.label}-${option.any_version}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm ${
                  option.any_version ? '' : 'pl-8'
                } ${
                  index === active
                    ? 'bg-rs-raised outline outline-2 -outline-offset-2 outline-rs-gold-bright'
                    : ''
                }`}
              >
                <ItemIcon url={option.icon_url} name={option.label} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.versions > 1 && (
                  <span className="shrink-0 text-xs text-rs-muted">
                    {option.any_version
                      ? t('cards.drops.anyVersion', { count: option.versions })
                      : t('cards.drops.thisVersion')}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="m-0 px-3 py-2 text-sm text-rs-muted">{status}</p>
          )}
        </div>
      )}
    </div>
  )
}
