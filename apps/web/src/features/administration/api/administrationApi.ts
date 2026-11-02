import { apiClient } from '../../../lib/api'
import type { CurrentUser } from '../../auth/api/authApi'

/** A directory row: the user plus their main RSN from the profile (feature 055). */
export interface DirectoryUser extends CurrentUser {
  rsn?: string | null
}

export interface UserDirectory {
  items: DirectoryUser[]
  total: number
  offset: number
  limit: number
  admin_count: number
}

export const fetchUsers = async (search: string, offset: number, limit: number) =>
  (await apiClient.get<UserDirectory>('/admin/users', { params: { search, offset, limit } })).data

export const changeRole = async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
  (await apiClient.patch<CurrentUser>(`/admin/users/${userId}/role`, { is_admin: isAdmin })).data

/** Current administrators, e.g. to record who received a buy-in (feature 023). */
export const fetchAdministrators = async () =>
  (await apiClient.get<CurrentUser[]>('/admin/administrators')).data
