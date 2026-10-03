import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSession, logout } from '../api/authApi'

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: fetchSession, retry: false })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await client.cancelQueries()
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      client.setQueryData(['session'], null)
    },
  })
}
