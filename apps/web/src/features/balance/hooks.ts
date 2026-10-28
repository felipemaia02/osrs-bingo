import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBossKcSettings, saveBossKcSettings } from './api'

const SETTINGS_KEY = ['boss-kc-settings'] as const

export function useBossKcSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchBossKcSettings })
}

export function useSaveBossKcSettings() {
  const client = useQueryClient()
  // Every total on the site changes: profiles, roster, team balance and draft.
  return useMutation({
    mutationFn: saveBossKcSettings,
    onSuccess: () => client.invalidateQueries(),
  })
}

/** "chambers_of_xeric_challenge_mode" → "Chambers Of Xeric Challenge Mode". */
export function bossLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
