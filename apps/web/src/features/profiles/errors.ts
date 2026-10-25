import { AxiosError } from 'axios'

const ERROR_KEYS: Record<string, string> = {
  'This account is already linked to another player': 'profile.errors.rsnTaken',
  'This account is already on your profile': 'profile.errors.rsnAlreadyYours',
  'You can link up to 10 accounts': 'profile.errors.tooMany',
  'Make another account the main before removing this one': 'profile.errors.mainNeeded',
  'Updated less than an hour ago': 'profile.errors.cooldown',
  'Account not found': 'profile.errors.accountMissing',
}

export function profileErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  if (Array.isArray(detail)) return 'profile.errors.rsnInvalid'
  return (typeof detail === 'string' && ERROR_KEYS[detail]) || 'common.apiError'
}
