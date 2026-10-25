import { useTranslation } from 'react-i18next'
import { useStatFormat } from '../hooks/useStatFormat'
import { COMBAT_SKILLS, type CombatSkill } from '../types'

const SHOWN_SKILLS = [...COMBAT_SKILLS, 'slayer'] as const
type ShownSkill = (typeof SHOWN_SKILLS)[number]

/**
 * The 7 combat skill levels plus Slayer (often a bingo requirement). `compact` (draft cards)
 * uses short labels in one row of 8; otherwise full names, 4 + 4 on mobile. Slayer shows "—"
 * until the account is read from WOM again.
 */
export function CombatLevels({
  combat,
  slayer,
  compact = false,
}: {
  combat: Partial<Record<CombatSkill, number>>
  slayer: number | null | undefined
  compact?: boolean
}) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const levels: Partial<Record<ShownSkill, number>> = { ...combat, slayer: slayer ?? undefined }
  return (
    <dl
      aria-label={t('profile.combat.title')}
      className={`m-0 grid gap-1 ${compact ? 'grid-cols-8' : 'grid-cols-4 gap-1.5 md:grid-cols-8'}`}
    >
      {SHOWN_SKILLS.map((skill) => (
        <div
          key={skill}
          className={`flex min-w-0 flex-col items-center rounded-[3px] border border-rs-border/40 bg-rs-inset ${
            compact ? 'px-0.5 py-1' : 'px-1 py-1.5'
          }`}
        >
          <dt
            title={t(`profile.combat.${skill}`)}
            className={`max-w-full truncate text-rs-muted ${compact ? 'text-[9px]' : 'text-[11px]'}`}
          >
            {t(compact ? `profile.combatShort.${skill}` : `profile.combat.${skill}`)}
          </dt>
          <dd
            className={`m-0 font-bold tabular-nums text-rs-gold-bright ${
              compact ? 'text-[13px]' : 'text-[15px]'
            }`}
          >
            {format.whole(levels[skill] ?? null)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
