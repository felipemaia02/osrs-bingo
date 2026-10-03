import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeRole, fetchUsers } from '../api/administrationApi'

export const DIRECTORY_PAGE_SIZE = 25

export function useUserDirectory(search: string, offset: number) {
  return useQuery({
    queryKey: ['administration', 'users', search, offset],
    queryFn: () => fetchUsers(search, offset, DIRECTORY_PAGE_SIZE),
  })
}

export function useChangeRole() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: changeRole,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['administration', 'users'] }),
        client.invalidateQueries({ queryKey: ['session'] }),
      ])
    },
  })
}
