import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAccount,
  fetchProfile,
  runAccountAction,
  savePreferences,
  searchMembers,
} from '../api/profileApi'
import { MEMBER_SEARCH_MIN_LENGTH, type Profile } from '../types'

const PROFILE_KEY = ['profile', 'me'] as const

export function useProfile(enabled: boolean) {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: fetchProfile, enabled })
}

/** Every profile change returns the whole profile, so the cache is replaced directly. */
function useProfileMutation<T>(mutationFn: (input: T) => Promise<Profile>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (profile) => client.setQueryData(PROFILE_KEY, profile),
  })
}

export function useAddAccount() {
  return useProfileMutation(addAccount)
}

export function useAccountAction() {
  return useProfileMutation(runAccountAction)
}

export function useSavePreferences() {
  return useProfileMutation(savePreferences)
}

/** Clan members whose Discord name or RSN contains the search (2+ characters). */
export function useMemberSearch(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: ['profile', 'members', term],
    queryFn: () => searchMembers(term),
    enabled: term.length >= MEMBER_SEARCH_MIN_LENGTH,
    staleTime: 30_000,
  })
}
