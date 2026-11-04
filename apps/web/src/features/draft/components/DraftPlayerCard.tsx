import { useId, type ReactNode } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInFullOutlinedIcon from '@mui/icons-material/OpenInFullOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CombatLevels } from '../../profiles/components/CombatLevels'
import { QuestsLine } from '../../profiles/components/Quests'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { zoneLabel } from '../../profiles/timezones'
import type { Skill } from '../../profiles/skills'
import { LateJoinBadge } from '../../teams/components/RosterRowParts'
import type { Player } from '../../teams/types'
import { skillLevel } from '../filters'
import { DRAG_TYPE } from '../rosters'

/** Reviewer first, then the buy-in; none for nickname registrations (FR-003). */
function PlayerBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  if (player.role === 'reviewer') return <Badge tone="info">{t('teams.roles.reviewer')}</Badge>
  if (player.buy_in_status === 'paid')
    return (
      <Badge tone="success">
        <PaymentsOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('teams.buyIn.paid')}
      </Badge>
    )
  if (player.buy_in_status === 'pending')
    return (
      <Badge tone="gold">
        <ScheduleOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('draft.buyInPending')}
      </Badge>
    )
  return null
}

export function DraftPlayerCard({
  player,
  large,
  expanded,
  onToggle,
  onOpen,
  skill,
  picker,
  draggable,
}: {
  player: Player
  large: boolean
  /** Compact by default; the expanded card shows the full details (049, FR-001). */
  expanded: boolean
  onToggle: () => void
  /** Opens the details modal (024, FR-009). */
  onOpen: () => void
  /** The skill chosen in the filter (032), shown with this player's level. */
  skill: Skill | null
  /** Team dropdown (049, FR-004); absent when nobody can be picked. */
  picker?: ReactNode
  /** Drag to a team on desktop (049, FR-003). */
  draggable: boolean
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const detailsId = useId()
  return (
    <article
      aria-label={player.display_name}
      draggable={draggable}
      onDragStart={(drag) => {
        drag.dataTransfer.setData(DRAG_TYPE, player.id)
        drag.dataTransfer.effectAllowed = 'move'
      }}
      // A click anywhere on the card toggles it (mouse); the name button is the keyboard path.
      // No overlay button: Firefox can't start a drag from a button.
      onClick={onToggle}
      className={`relative flex flex-col gap-2.5 rounded border bg-rs-surface p-3 shadow-rs-panel cursor-pointer hover:border-rs-border-strong ${
        expanded ? 'border-rs-border-strong' : 'border-rs-border/70'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(click) => {
            click.stopPropagation()
            onToggle()
          }}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className={`flex min-w-0 items-center gap-1 text-left font-bold text-rs-text ${
            large ? 'text-lg' : ''
          }`}
        >
          <ExpandMoreIcon
            fontSize="small"
            aria-hidden="true"
            className={`shrink-0 text-rs-gold transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          <span className="truncate">{player.display_name}</span>
        </button>
        <span className="flex flex-wrap justify-end gap-1">
          <LateJoinBadge player={player} />
          <PlayerBadge player={player} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="flex gap-4 text-xs text-rs-muted">
          <span>
            {t('draft.ehb')}{' '}
            <strong
              className={`tabular-nums text-rs-gold-bright ${large ? 'text-xl' : 'text-base'}`}
            >
              {format.hours(player.ehb_total ?? null)}
            </strong>
          </span>
          <span>
            {t('draft.bossKc')}{' '}
            <strong
              className={`tabular-nums text-rs-gold-bright ${large ? 'text-xl' : 'text-base'}`}
            >
              {format.whole(player.boss_kc_total ?? null)}
            </strong>
          </span>
          {skill && (
            <span>
              {t(`skills.${skill}`)}{' '}
              <strong className="text-base tabular-nums text-rs-gold-bright">
                {format.whole(skillLevel(player, skill))}
              </strong>
            </span>
          )}
        </span>
        {picker}
      </div>
      {expanded && (
        <div id={detailsId} className="flex flex-col gap-2.5 border-t border-rs-border/45 pt-2.5">
          <PlayerDetails player={player} large={large} />
          <Button
            className="self-start"
            onClick={(click) => {
              click.stopPropagation()
              onOpen()
            }}
          >
            <OpenInFullOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('draft.pick.allDetails')}
          </Button>
        </div>
      )}
    </article>
  )
}

/** What the full 024 card showed: raids, levels, combat, quests, zone, activity, alts, wishes. */
function PlayerDetails({ player, large }: { player: Player; large: boolean }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const alts =
    player.alt_count === null || player.alt_count === undefined
      ? null
      : player.alt_count
        ? t('draft.alts', { count: player.alt_count })
        : t('draft.noAlts')
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('draft.ehb')} value={format.hours(player.ehb_total ?? null)} large={large} />
        <Stat
          label={t('draft.bossKc')}
          value={format.whole(player.boss_kc_total ?? null)}
          large={large}
        />
        <Stat
          label={t('draft.raidsKc')}
          value={format.whole(player.raids_kc_total ?? null)}
          large={large}
        />
      </div>
      {player.account && (
        <>
          <span className="flex gap-3 text-xs">
            <span>
              {t('draft.totalLevel')}{' '}
              <strong className="tabular-nums text-rs-gold-bright">
                {format.whole(player.account.total_level)}
              </strong>
            </span>
            <span>
              {t('draft.combatLevel')}{' '}
              <strong className="tabular-nums text-rs-gold-bright">
                {format.whole(player.account.combat_level)}
              </strong>
            </span>
          </span>
          {player.account.combat && (
            <CombatLevels
              combat={player.account.combat}
              slayer={player.account.skills?.slayer}
              compact
            />
          )}
          <QuestsLine data={player.account.wikisync} />
        </>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rs-muted">
        <span className="inline-flex items-center gap-1">
          <PublicOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          {player.timezone ? zoneLabel(player.timezone) : '—'}
        </span>
        {player.activity && (
          <span className="inline-flex items-center gap-1">
            <ScheduleOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
            {t(`join.activity.short.${player.activity}`)}
          </span>
        )}
        {alts && <span>{alts}</span>}
      </span>
      <span className="text-xs">
        {player.teammates?.length ? (
          <>
            {t('draft.wants')}{' '}
            <strong className="text-rs-gold-bright">{player.teammates.join(', ')}</strong>
          </>
        ) : (
          <span className="text-rs-muted">{t('draft.noPreference')}</span>
        )}
      </span>
    </>
  )
}

function Stat({ label, value, large }: { label: string; value: string; large: boolean }) {
  return (
    <div className="flex flex-col rounded-[3px] border border-rs-border/60 bg-rs-inset px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-[.06em] text-rs-muted">{label}</span>
      <strong className={`tabular-nums text-rs-gold-bright ${large ? 'text-2xl' : 'text-xl'}`}>
        {value}
      </strong>
    </div>
  )
}
