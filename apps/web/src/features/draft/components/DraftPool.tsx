import { useMemo, useState, type ReactNode } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { normalizeSearch } from '../../../lib/text/search'
import { REGIONS } from '../../profiles/timezones'
import { ACTIVITIES } from '../../profiles/types'
import type { Player } from '../../teams/types'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL, SKILLS, type Skill } from '../../profiles/skills'
import {
  DEFAULT_FILTER,
  SORTS,
  visiblePlayers,
  withoutSkillData,
  type DraftFilter,
} from '../filters'
import type { DraftParticipantActions } from './DraftBoard'
import { DraftPlayerCard } from './DraftPlayerCard'

interface DraftPoolProps {
  players: Player[]
  /** Null when nobody can be drafted (no team on the clock). */
  onDraft: ((player: Player) => void) | null
  onOpen: (player: Player) => void
  /** Edit role/buy-in/tier and remove the registration; null when read-only. */
  actions: DraftParticipantActions | null
}

/** "Available pool": search, sort, filters and "+ Draft" on each player (076 FR-004). */
export function DraftPool({ players, onDraft, onOpen, actions }: DraftPoolProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DraftFilter>(DEFAULT_FILTER)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const skill = filter.skill === 'any' ? null : filter.skill
  const missingSkills = useMemo(() => withoutSkillData(players, filter), [players, filter])
  // Skills sorted by their name in the current language (feature 032).
  const skillOptions = useMemo(
    () => [...SKILLS].sort((a, b) => t(`skills.${a}`).localeCompare(t(`skills.${b}`))),
    [t],
  )
  const shown = useMemo(() => {
    const text = normalizeSearch(search)
    return visiblePlayers(players, filter).filter((player) =>
      normalizeSearch(player.display_name).includes(text),
    )
  }, [players, filter, search])

  const select = <T extends string>(
    label: string,
    value: T,
    options: readonly T[],
    optionLabel: (option: T) => string,
    onChange: (value: T) => void,
  ) => (
    <label className="flex flex-1 flex-col gap-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-rs-muted">
      {label}
      <select
        value={value}
        onChange={(change) => onChange(change.target.value as T)}
        className={`${FIELD_CLASS} min-h-9 normal-case tracking-normal`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section aria-labelledby="draft-pool" className="flex min-h-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="draft-pool"
          className="m-0 text-sm font-semibold uppercase tracking-[.12em] text-rs-gold"
        >
          {t('draft.board.pool', { count: players.length })}
        </h2>
        <span className="text-xs text-rs-muted">{t('draft.board.poolHint')}</span>
      </div>
      <label className="relative flex items-center">
        <SearchOutlinedIcon
          fontSize="small"
          className="pointer-events-none absolute left-2.5 text-rs-muted"
          aria-hidden="true"
        />
        <span className="sr-only">{t('draft.board.search')}</span>
        <input
          type="search"
          maxLength={80}
          value={search}
          onChange={(change) => setSearch(change.target.value)}
          placeholder={t('draft.board.search')}
          className={`${FIELD_CLASS} pl-[38px]`}
        />
      </label>
      <div className="flex gap-2">
        {select(
          t('draft.sortBy'),
          filter.sort,
          SORTS,
          (option) => t(`draft.sorts.${option}`),
          (sort) => setFilter({ ...filter, sort }),
        )}
        {select(
          t('draft.region'),
          filter.region,
          ['all', ...REGIONS] as const,
          (option) => t(`draft.regions.${option}`),
          (region) => setFilter({ ...filter, region }),
        )}
        {select(
          t('draft.activity'),
          filter.activity,
          ['any', ...ACTIVITIES] as const,
          (option) =>
            option === 'any' ? t('draft.anyActivity') : t(`join.activity.short.${option}`),
          (activity) => setFilter({ ...filter, activity }),
        )}
      </div>
      <div className="flex items-end gap-2">
        {select(
          t('draft.skill'),
          filter.skill,
          ['any', ...skillOptions] as const,
          (option) => (option === 'any' ? t('draft.anySkill') : t(`skills.${option}`)),
          (value: Skill | 'any') => setFilter({ ...filter, skill: value }),
        )}
        {skill && (
          <label className="flex flex-col gap-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-rs-muted">
            {t('draft.minLevel')}
            <input
              type="number"
              inputMode="numeric"
              min={MIN_SKILL_LEVEL}
              max={MAX_SKILL_LEVEL}
              value={filter.minLevel ?? ''}
              onChange={(change) =>
                setFilter({ ...filter, minLevel: levelOf(change.target.value) })
              }
              className={`${FIELD_CLASS} min-h-9 w-20`}
            />
          </label>
        )}
      </div>
      {missingSkills > 0 && (
        <InfoBanner>{t('draft.noSkillData', { count: missingSkills })}</InfoBanner>
      )}
      {!players.length ? (
        <p className="m-0 rounded border border-rs-border/60 bg-rs-inset p-4 text-center text-sm text-rs-muted">
          {t('draft.board.everyoneDrafted')}
        </p>
      ) : (
        <ul className="m-0 flex min-h-0 list-none flex-col gap-2 overflow-y-auto p-0 lg:pr-1">
          {shown.map((player) => (
            <li key={player.id}>
              <DraftPlayerCard
                player={player}
                large={false}
                skill={skill}
                expanded={expandedId === player.id}
                onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
                onOpen={() => onOpen(player)}
                picker={
                  (onDraft || actions) && (
                    <span className="flex items-center gap-1">
                      {actions && (
                        <>
                          <IconAction
                            label={t('teams.participant.edit', { name: player.display_name })}
                            onClick={() => actions.onEdit(player)}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconAction>
                          <IconAction
                            label={t('teams.removePlayer', { name: player.display_name })}
                            onClick={() => actions.onRemove(player)}
                          >
                            <PersonRemoveOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconAction>
                        </>
                      )}
                      {onDraft && (
                        <Button
                          size="sm"
                          variant="primary"
                          aria-label={t('draft.board.draftPlayer', { name: player.display_name })}
                          onClick={(click) => {
                            click.stopPropagation()
                            onDraft(player)
                          }}
                        >
                          <AddOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
                          {t('draft.board.draft')}
                        </Button>
                      )}
                    </span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-xs text-rs-muted">{t('draft.sigma')}</p>
    </section>
  )
}

/** The typed minimum level, kept within 1–99; empty means no minimum yet. */
function levelOf(value: string): number | null {
  if (value.trim() === '') return null
  const level = Math.trunc(Number(value))
  if (Number.isNaN(level)) return null
  return Math.min(MAX_SKILL_LEVEL, Math.max(MIN_SKILL_LEVEL, level))
}

/** Small icon button inside a pool card; clicks don't toggle the card. */
function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(click) => {
        click.stopPropagation()
        onClick()
      }}
      className="inline-flex size-8 items-center justify-center rounded-[3px] border border-rs-border text-rs-text hover:bg-rs-raised"
    >
      {children}
    </button>
  )
}
