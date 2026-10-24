import { useId, useState, type KeyboardEvent } from 'react'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../../components/ui/Avatar'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useMemberSearch } from '../../profiles/hooks/useProfile'
import { MEMBER_SEARCH_MIN_LENGTH, type Member } from '../../profiles/types'

export const MAX_TEAMMATES = 3
const SEARCH_DELAY_MS = 250

/** Up to 3 preferred teammates picked from clan members (FR-003, BR-003). */
export function TeammatePicker({
  value,
  onChange,
}: {
  value: Member[]
  onChange: (members: Member[]) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  const term = useDebouncedValue(search, SEARCH_DELAY_MS)
  const results = useMemberSearch(term)
  const full = value.length >= MAX_TEAMMATES
  const options = (results.data ?? []).filter(
    (member) => !value.some((picked) => picked.user_id === member.user_id),
  )
  const open = !full && search.trim().length >= MEMBER_SEARCH_MIN_LENGTH
  const listId = `${id}-list`

  const add = (member: Member) => {
    onChange([...value, member])
    setSearch('')
    setActive(0)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      add(options[Math.min(active, options.length - 1)])
    } else if (event.key === 'Escape') setSearch('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-input`} className="text-sm font-semibold">
        {t('join.teammates.label')}{' '}
        <span className="font-normal text-rs-muted">
          {t('join.teammates.count', { count: value.length, max: MAX_TEAMMATES })}
        </span>
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[3px] border border-rs-border bg-rs-inset px-2 py-1.5 focus-within:border-rs-gold">
        {value.map((member) => (
          <span
            key={member.user_id}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-rs-border-strong bg-rs-warning-bg py-1 pl-2.5 pr-1 text-[13px]"
          >
            {member.main_rsn ?? member.username}
            <button
              type="button"
              aria-label={t('join.teammates.remove', { name: member.main_rsn ?? member.username })}
              onClick={() => onChange(value.filter((item) => item.user_id !== member.user_id))}
              className="inline-flex size-6 items-center justify-center rounded-full text-rs-text hover:bg-rs-raised"
            >
              <CloseOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options.length ? `${listId}-${active}` : undefined}
          disabled={full}
          value={search}
          placeholder={full ? t('join.teammates.full') : t('join.teammates.placeholder')}
          onChange={(event) => {
            setSearch(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          className="min-w-32 flex-1 border-0 bg-transparent py-1 text-sm text-rs-text outline-none placeholder:text-rs-muted"
        />
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('join.teammates.results')}
          className="rounded border border-rs-border/70 bg-rs-surface py-1 shadow-rs-panel"
        >
          {results.isLoading || term !== search ? (
            <p className="m-0 px-3 py-2 text-sm text-rs-muted">{t('common.loading')}</p>
          ) : options.length ? (
            options.map((member, index) => (
              <div
                key={member.user_id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(member)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${
                  index === active
                    ? 'bg-rs-raised outline outline-2 -outline-offset-2 outline-rs-gold-bright'
                    : ''
                }`}
              >
                <Avatar name={member.main_rsn ?? member.username} />
                <span className="min-w-0 flex-1 truncate">
                  <strong>{member.main_rsn ?? member.username}</strong>
                  {member.main_rsn && (
                    <span className="text-rs-muted">
                      {' '}
                      · {t('join.teammates.onDiscord', { name: member.username })}
                    </span>
                  )}
                </span>
                {index === active && (
                  <span className="hidden text-xs text-rs-muted md:inline">
                    {t('join.teammates.enter')}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="m-0 px-3 py-2 text-sm text-rs-muted">
              {t(results.isError ? 'common.apiError' : 'join.teammates.none')}
            </p>
          )}
        </div>
      )}
      <span className="text-[13px] text-rs-muted">{t('join.teammates.hint')}</span>
    </div>
  )
}
