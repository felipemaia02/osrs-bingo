import { AxiosError } from 'axios'

const ERROR_TRANSLATION: Record<string, string> = {
  'Already registered in this event': 'teams.errors.duplicatePlayer',
  'Registration already exists in this event': 'teams.errors.duplicatePlayer',
  'Only approved registrations can be assigned': 'teams.errors.approvedOnly',
  'Only pending registrations can be approved': 'teams.errors.pendingOnly',
  'Registration is already removed': 'teams.errors.removed',
  'Administrator access required': 'auth.adminRequired',
  'Authentication required': 'auth.loginRequired',
  'Untrusted request origin': 'auth.requestRejected',
  'Player name already exists in this event': 'teams.errors.duplicatePlayer',
  'Team name already exists in this event': 'teams.errors.duplicateTeam',
  'Only draft events can be changed': 'teams.errors.readOnly',
  'Event not found': 'events.errors.notFound',
  'Player not found': 'teams.errors.playerNotFound',
  'Team not found': 'teams.errors.teamNotFound',
  'Choose an account from your profile': 'join.errors.account',
  "This account isn't found on Wise Old Man": 'join.errors.accountNotOnWom',
  "You can't pick yourself as a teammate": 'join.errors.teammateSelf',
  'Preferred teammate not found': 'join.errors.teammateUnknown',
}

export function teamErrorKey(error: unknown): string {
  const detail = error instanceof AxiosError ? error.response?.data?.detail : null
  if (typeof detail === 'string') return ERROR_TRANSLATION[detail] ?? 'common.apiError'
  if (error instanceof AxiosError && error.response?.status === 422)
    return 'teams.errors.invalidInput'
  return 'common.apiError'
}
