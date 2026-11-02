import { useEffect, useMemo, useState, type ReactNode } from 'react'
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined'
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { REGIONS } from '../../profiles/timezones'
import { ACTIVITIES } from '../../profiles/types'
import { useDraftPreview } from '../../teams/hooks/useTeams'
import { DraftPlayerCard } from '../components/DraftPlayerCard'
import { DraftPlayerModal } from '../components/DraftPlayerModal'
import { TeamPicker } from '../components/TeamPicker'
import { TeamRosters } from '../components/TeamRosters'
import { useDraftAssign } from '../hooks/useDraftAssign'
import { acceptsPlayer, draggedPlayer, teamRosters } from '../rosters'
import { teamErrorKey } from '../../teams/errors'
import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL, SKILLS, type Skill } from '../../profiles/skills'
import {
  DEFAULT_FILTER,
  SORTS,
  visiblePlayers,
  withoutSkillData,
  type DraftFilter,
} from '../filters'

const byCreation = (a: BingoEvent, b: BingoEvent) => a.created_at.localeCompare(b.created_at)

/** Admin-only board for the captains' pick session (feature 024). */
export function DraftPreviewPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents('draft')
  const drafts = useMemo(() => [...(events.data ?? [])].sort(byCreation), [events.data])
  const [chosen, setChosen] = useState<string | null>(null)
  const event = drafts.find((item) => item.id === chosen) ?? drafts[0] ?? null
  const [presenting, setPresenting] = usePresentation()
  const presentation = presenting && isDesktop

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
          {event ? t('draft.eyebrow', { event: event.name }) : t('admin.title')}
        </span>
        <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
          {t('draft.title')}
        </h1>
        {!presentation && (
          <span className="max-w-2xl text-[13px] text-rs-muted md:text-sm">
            {t('draft.description')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {drafts.length > 1 && !presentation && (
          <label className="flex items-center gap-2 text-[13px]">
            <span className="sr-only">{t('teams.selectEvent')}</span>
            <select
              value={event?.id ?? ''}
              onChange={(change) => setChosen(change.target.value)}
              className={FIELD_CLASS}
            >
              {drafts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {isDesktop && event && (
          <Button onClick={() => setPresenting(!presenting)}>
            {presentation ? (
              <FullscreenExitOutlinedIcon fontSize="small" aria-hidden="true" />
            ) : (
              <CoPresentOutlinedIcon fontSize="small" aria-hidden="true" />
            )}
            {t(presentation ? 'draft.exitPresentation' : 'draft.presentation')}
          </Button>
        )}
      </div>
    </div>
  )

  const body: ReactNode = events.isLoading ? (
    <p role="status" className="text-rs-muted">
      {t('common.loading')}
    </p>
  ) : events.isError ? (
    <p role="alert">{t('common.apiError')}</p>
  ) : !event ? (
    <InfoBanner>{t('draft.noDraft')}</InfoBanner>
  ) : (
    <DraftBoard key={event.id} eventId={event.id} large={presentation} canDrag={isDesktop} />
  )

  const content = (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {header}
      {body}
    </div>
  )

  if (presentation)
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('draft.title')}
        className="fixed inset-0 z-50 overflow-auto bg-rs-canvas p-8 text-rs-text"
      >
        {content}
      </div>
    )
  return <AppShell desktopPadding="md:px-8 md:pt-6">{content}</AppShell>
}

function DraftBoard({
  eventId,
  large,
  canDrag,
}: {
  eventId: string
  large: boolean
  /** Drag-and-drop on desktop only; the team dropdown works everywhere (049). */
  canDrag: boolean
}) {
  const { t } = useTranslation()
  const preview = useDraftPreview(eventId)
  const assign = useDraftAssign(eventId)
  const [filter, setFilter] = useState<DraftFilter>(DEFAULT_FILTER)
  const [openId, setOpenId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overAvailable, setOverAvailable] = useState(false)
  const players = useMemo(() => preview.data?.players ?? [], [preview.data])
  const rosters = useMemo(() => (preview.data ? teamRosters(preview.data) : []), [preview.data])
  const shown = useMemo(() => visiblePlayers(players, filter), [players, filter])
  const missingSkills = useMemo(() => withoutSkillData(players, filter), [players, filter])
  const skill = filter.skill === 'any' ? null : filter.skill
  // Skills sorted by their name in the current language.
  const skillOptions = useMemo(
    () => [...SKILLS].sort((a, b) => t(`skills.${a}`).localeCompare(t(`skills.${b}`))),
    [t],
  )
  // Read from the latest data so a refresh while it's open shows current values.
  const opened = players.find((player) => player.id === openId) ?? null
  const pick = (playerId: string, teamId: string | null) => {
    if (assign.isPending) return
    const current = [...players, ...(preview.data?.members ?? [])].find(
      (player) => player.id === playerId,
    )
    if (!current || current.team_id === teamId) return
    assign.mutate({ playerId, teamId })
  }

  if (preview.isLoading)
    return (
      <p role="status" className="text-rs-muted">
        {t('common.loading')}
      </p>
    )
  if (preview.isError || !preview.data) return <p role="alert">{t('common.apiError')}</p>

  const select = <T extends string>(
    label: string,
    value: T,
    options: readonly T[],
    optionLabel: (option: T) => string,
    onChange: (value: T) => void,
  ) => (
    <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
      {label}
      <select
        value={value}
        onChange={(change) => onChange(change.target.value as T)}
        className={`${FIELD_CLASS} min-h-9 w-auto`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )

  const teams = preview.data.captains
  const available = (
    <section
      aria-label={t('draft.pick.available')}
      onDragOver={(drag) => {
        if (!canDrag || !acceptsPlayer(drag)) return
        drag.preventDefault()
        setOverAvailable(true)
      }}
      onDragLeave={() => setOverAvailable(false)}
      onDrop={(drag) => {
        setOverAvailable(false)
        const playerId = draggedPlayer(drag)
        if (!playerId) return
        drag.preventDefault()
        pick(playerId, null)
      }}
      className={`flex min-w-0 flex-col gap-3 rounded ${
        overAvailable ? 'outline outline-2 outline-offset-4 outline-rs-gold-bright' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        {select(
          t('draft.skill'),
          filter.skill,
          ['any', ...skillOptions] as const,
          (option) => (option === 'any' ? t('draft.anySkill') : t(`skills.${option}`)),
          (value: Skill | 'any') => setFilter({ ...filter, skill: value }),
        )}
        {skill && (
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
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
        {select(
          t('draft.sortBy'),
          filter.sort,
          SORTS,
          (option) => t(`draft.sorts.${option}`),
          (sort) => setFilter({ ...filter, sort }),
        )}
        <span role="status" className="text-[13px] text-rs-muted md:ml-auto">
          {skill
            ? t('draft.countSkill', {
                count: shown.length,
                skill: t(`skills.${skill}`),
                level: filter.minLevel ?? MIN_SKILL_LEVEL,
              })
            : t('draft.count', { count: shown.length })}
        </span>
      </div>
      {missingSkills > 0 && (
        <InfoBanner>{t('draft.noSkillData', { count: missingSkills })}</InfoBanner>
      )}
      {!players.length ? (
        <InfoBanner>{t('draft.everyoneAssigned')}</InfoBanner>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((player) => (
            <DraftPlayerCard
              key={player.id}
              player={player}
              large={large}
              skill={skill}
              expanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              onOpen={() => setOpenId(player.id)}
              draggable={canDrag && teams.length > 0}
              picker={
                <TeamPicker
                  name={player.display_name}
                  teamId={null}
                  teams={teams}
                  disabled={assign.isPending}
                  onPick={(teamId) => pick(player.id, teamId)}
                />
              }
            />
          ))}
        </div>
      )}
      <p className="m-0 text-xs text-rs-muted">{t('draft.sigma')}</p>
    </section>
  )

  return (
    <>
      {assign.isError && (
        <p
          role="alert"
          className="m-0 rounded border border-rs-danger bg-rs-danger-bg px-3 py-2 text-sm"
        >
          {t('draft.pick.failed', { reason: t(teamErrorKey(assign.error)) })}
        </p>
      )}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <aside
          aria-label={t('draft.pick.rosters')}
          className={`lg:sticky lg:order-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto ${
            large ? 'lg:top-4' : 'lg:top-20'
          }`}
        >
          {canDrag ? (
            <TeamRosters
              rosters={rosters}
              teams={teams}
              canDrag={canDrag}
              busy={assign.isPending}
              onPick={pick}
            />
          ) : (
            <details className="rounded border border-rs-border/70 bg-rs-inset" open>
              <summary className="cursor-pointer px-3 py-2.5 font-semibold text-rs-gold-bright">
                {t('draft.pick.rostersSummary', { count: rosters.length })}
              </summary>
              <div className="p-3 pt-0">
                <TeamRosters
                  rosters={rosters}
                  teams={teams}
                  canDrag={false}
                  busy={assign.isPending}
                  onPick={pick}
                />
              </div>
            </details>
          )}
        </aside>
        {available}
      </div>
      {opened && <DraftPlayerModal player={opened} onClose={() => setOpenId(null)} />}
    </>
  )
}

/** The typed minimum level, kept within 1–99; empty means no minimum yet. */
function levelOf(value: string): number | null {
  if (value.trim() === '') return null
  const level = Math.trunc(Number(value))
  if (Number.isNaN(level)) return null
  return Math.min(MAX_SKILL_LEVEL, Math.max(MIN_SKILL_LEVEL, level))
}

/** Presentation mode: browser full screen when available; Escape or leaving full screen ends it. */
function usePresentation(): [boolean, (value: boolean) => void] {
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    if (!presenting) return
    const root = document.documentElement
    void root.requestFullscreen?.().catch(() => undefined)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresenting(false)
    }
    const onFullscreen = () => {
      if (!document.fullscreenElement) setPresenting(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreen)
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
    }
  }, [presenting])

  return [presenting, setPresenting]
}
