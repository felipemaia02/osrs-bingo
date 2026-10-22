import { AxiosError } from 'axios'

const ERROR_KEYS: Record<string, string> = {
  'Cannot remove the last administrator': 'admin.errors.lastAdmin',
  'Administrator roles changed; try again': 'admin.errors.changed',
  'Administration is not initialized': 'admin.errors.notInitialized',
  'User not found': 'admin.errors.userNotFound',
  'Administrator access required': 'auth.adminRequired',
  'Authentication required': 'auth.loginRequired',
  'Too many requests': 'admin.errors.rateLimit',
}

/** Translation key for a role change API error. */
export function roleErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  return (typeof detail === 'string' && ERROR_KEYS[detail]) || 'common.apiError'
}
