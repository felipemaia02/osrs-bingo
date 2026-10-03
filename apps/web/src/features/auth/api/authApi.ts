import { AxiosError } from 'axios'
import { apiClient } from '../../../lib/api'

export interface CurrentUser {
  id: string
  discord_id: string
  username: string
  is_admin: boolean
}

export async function fetchSession(): Promise<CurrentUser | null> {
  try {
    return (await apiClient.get<CurrentUser>('/auth/me')).data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) return null
    throw error
  }
}

export const discordLoginUrl = `${apiClient.defaults.baseURL}/auth/discord/login`
export const logout = async () => {
  await apiClient.post('/auth/logout')
}
