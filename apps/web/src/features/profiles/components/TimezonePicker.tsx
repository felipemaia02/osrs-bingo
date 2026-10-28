import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import {
  browserTimezone,
  commonTimezones,
  searchTimezones,
  timezoneGroups,
  zoneLabel,
  type TimezoneOption,
} from '../timezones'

const MAX_RESULTS = 40

/**
 * Time zone picker (feature 043): the detected zone, a search by city, country or UTC offset,
 * common zones by default and the full list on demand. The exact IANA zone is saved.
 */
export function TimezonePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (zone: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [active, setActive] = useState(0)
  const detected = browserTimezone()
  const options: TimezoneOption[] = useMemo(() => {
    if (query.trim()) return searchTimezones(query).slice(0, MAX_RESULTS)
    if (showAll) return timezoneGroups(value).flatMap((group) => group.zones)
    return commonTimezones()
  }, [query, showAll, value])

  const pick = (zone: string) => {
    onChange(zone)
    setQuery('')
    setOpen(false)
    setShowAll(false)
    setActive(0)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      pick(options[Math.min(active, options.length - 1)].id)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-semibold">
        {t('profile.preferences.timezone')}
      </span>
      <span
        role="status"
        className="flex min-h-10 items-center gap-2 rounded-[3px] border border-rs-border bg-rs-inset px-3 text-sm"
      >
        <PublicOutlinedIcon sx={{ fontSize: 18 }} className="text-rs-gold" aria-hidden="true" />
        {value ? zoneLabel(value) : t('profile.preferences.noTimezone')}
      </span>
      {detected && detected !== value && (
        <span className="flex flex-wrap items-center gap-2 text-[13px] text-rs-muted">
          {t('profile.timezone.detected', { zone: zoneLabel(detected) })}
          <Button size="sm" variant="ghost" onClick={() => pick(detected)}>
            {t('profile.timezone.useDetected')}
          </Button>
        </span>
      )}
      <div className="relative">
        <SearchOutlinedIcon
          fontSize="small"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-rs-muted"
          aria-hidden="true"
        />
        <input
          role="combobox"
          aria-labelledby={`${id}-label`}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options.length ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={t('profile.timezone.search')}
          onChange={(change) => {
            setQuery(change.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-h-10 w-full rounded-[3px] border border-rs-border bg-rs-inset pl-9 pr-3 text-sm text-rs-text outline-none placeholder:text-rs-muted focus:border-rs-gold"
        />
        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={t('profile.timezone.results')}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded border border-rs-border/70 bg-rs-surface py-1 shadow-rs-panel"
          >
            {!query.trim() && (
              <p className="m-0 px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-rs-muted">
                {t(showAll ? 'profile.timezone.all' : 'profile.timezone.common')}
              </p>
            )}
            {options.length ? (
              options.map((option, index) => (
                <div
                  key={option.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option.id)}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    index === active
                      ? 'bg-rs-raised outline outline-2 -outline-offset-2 outline-rs-gold-bright'
                      : ''
                  } ${option.id === value ? 'font-semibold text-rs-gold-bright' : ''}`}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <p className="m-0 px-3 py-2 text-sm text-rs-muted">{t('profile.timezone.none')}</p>
            )}
            {!query.trim() && !showAll && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowAll(true)}
                className="w-full px-3 py-2 text-left text-sm text-rs-gold-bright hover:bg-rs-raised"
              >
                {t('profile.timezone.showAll')}
              </button>
            )}
          </div>
        )}
      </div>
      <span className="text-xs text-rs-muted">{t('profile.timezone.hint')}</span>
    </div>
  )
}
