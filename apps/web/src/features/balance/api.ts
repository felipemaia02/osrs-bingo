import { apiClient } from '../../lib/api'

/** Bosses left out of boss KC totals and the raid entries shown apart (feature 039). */
export interface BossKcSettings {
  excluded: string[]
  raids: string[]
  known: string[]
}

export async function fetchBossKcSettings(): Promise<BossKcSettings> {
  return (await apiClient.get<BossKcSettings>('/boss-kc-settings')).data
}

export async function saveBossKcSettings(excluded: string[]): Promise<BossKcSettings> {
  return (await apiClient.put<BossKcSettings>('/boss-kc-settings', { excluded })).data
}
