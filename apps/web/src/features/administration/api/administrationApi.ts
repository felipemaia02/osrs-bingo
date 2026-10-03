import { apiClient } from '../../../lib/api'
import type { CurrentUser } from '../../auth/api/authApi'

export interface UserDirectory {
  items: CurrentUser[]
  total: number
  offset: number
  limit: number
}

export const fetchUsers = async (search: string, offset: number, limit: number) =>
  (await apiClient.get<UserDirectory>('/admin/users', { params: { search, offset, limit } })).data

export const changeRole = async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
  (await apiClient.patch<CurrentUser>(`/admin/users/${userId}/role`, { is_admin: isAdmin })).data
