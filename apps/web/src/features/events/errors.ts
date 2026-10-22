import { AxiosError } from 'axios'

const ERROR_TRANSLATION: Record<string, string> = {
  'Active event limit reached': 'events.errors.activeLimit',
  'Only draft events can be edited': 'events.errors.readOnly',
  'Event status does not allow this transition': 'events.errors.invalidTransition',
  'Event not found': 'events.errors.notFound',
  'A complete valid board is required': 'events.errors.boardRequired',
}

/** Translation key for an events API error. */
export function eventErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  return (typeof detail === 'string' && ERROR_TRANSLATION[detail]) || 'common.apiError'
}
