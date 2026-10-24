import { useTranslation } from 'react-i18next'
import type { Player } from './types'

/** "felps.discord · main + 2 alts" (feature 023). */
export function useAccountsLine() {
  const { t } = useTranslation()
  return (player: Player) =>
    [
      player.discord_username,
      player.alt_count === null || player.alt_count === undefined
        ? null
        : player.alt_count
          ? t('teams.roster.mainAndAlts', { count: player.alt_count })
          : t('teams.roster.mainOnly'),
    ]
      .filter(Boolean)
      .join(' · ') || '—'
}

/** "Berlin" for Europe/Berlin; the full zone stays in the title. */
export function timezoneCity(zone: string | null | undefined): string {
  if (!zone) return '—'
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ')
}
