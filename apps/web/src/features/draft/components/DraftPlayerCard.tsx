import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { CombatLevels } from '../../profiles/components/CombatLevels'
import { QuestsAndDiariesLine } from '../../profiles/components/QuestsAndDiaries'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { zoneLabel } from '../../profiles/timezones'
import type { Skill } from '../../profiles/skills'
import { LateJoinBadge } from '../../teams/components/RosterRowParts'
import type { Player } from '../../teams/types'
import { skillLevel } from '../filters'

/** Instructor first, then the buy-in; none for nickname registrations (FR-003). */
function PlayerBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  if (player.role === 'instructor') return <Badge tone="info">{t('teams.roles.instructor')}</Badge>
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
  onOpen,
  skill,
}: {
  player: Player
  large: boolean
  onOpen: () => void
  /** The skill chosen in the filter (032), shown with this player's level. */
  skill: Skill | null
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const alts =
    player.alt_count === null || player.alt_count === undefined
      ? null
      : player.alt_count
        ? t('draft.alts', { count: player.alt_count })
        : t('draft.noAlts')
  return (
    <article
      aria-label={player.display_name}
      className="relative flex flex-col gap-2.5 rounded border border-rs-border/70 bg-rs-surface p-3 shadow-rs-panel hover:border-rs-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        {/* The name is the card's button; its overlay makes the whole card clickable. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('draft.details', { name: player.display_name })}
          className={`min-w-0 truncate text-left font-bold text-rs-text after:absolute after:inset-0 after:content-[''] ${
            large ? 'text-lg' : ''
          }`}
        >
          {player.display_name}
        </button>
        <span className="flex flex-wrap justify-end gap-1">
          <LateJoinBadge player={player} />
          <PlayerBadge player={player} />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={t('draft.ehb')} value={format.hours(player.ehb_total ?? null)} large={large} />
        <Stat
          label={t('draft.bossKc')}
          value={format.whole(player.boss_kc_total ?? null)}
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
            {skill && (
              <span>
                {t(`skills.${skill}`)}{' '}
                <strong className="tabular-nums text-rs-gold-bright">
                  {format.whole(skillLevel(player, skill))}
                </strong>
              </span>
            )}
          </span>
          {player.account.combat && (
            <CombatLevels
              combat={player.account.combat}
              slayer={player.account.skills?.slayer}
              compact
            />
          )}
          <QuestsAndDiariesLine data={player.account.wikisync} />
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
    </article>
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
