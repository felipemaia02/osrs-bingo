import { apiClient } from '../../../lib/api'
import type { AccountAction, Preferences, Profile } from '../types'

const PROFILE_URL = '/profile/me'

export async function fetchProfile(): Promise<Profile> {
  return (await apiClient.get<Profile>(PROFILE_URL)).data
}

export async function savePreferences(preferences: Preferences): Promise<Profile> {
  return (await apiClient.patch<Profile>(`${PROFILE_URL}/preferences`, preferences)).data
}

export async function addAccount(rsn: string): Promise<Profile> {
  return (await apiClient.post<Profile>(`${PROFILE_URL}/accounts`, { rsn })).data
}

export async function runAccountAction({
  accountId,
  action,
}: {
  accountId: string
  action: AccountAction
}): Promise<Profile> {
  const url = `${PROFILE_URL}/accounts/${accountId}`
  if (action === 'remove') return (await apiClient.delete<Profile>(url)).data
  return (await apiClient.post<Profile>(`${url}/${action}`)).data
}
