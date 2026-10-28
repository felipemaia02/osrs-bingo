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
  "This event isn't taking new players": 'teams.errors.joinClosed',
  "Players already on a team can't be moved or removed during the event": 'teams.errors.teamLocked',
  'Event not found': 'events.errors.notFound',
  'Player not found': 'teams.errors.playerNotFound',
  'Team not found': 'teams.errors.teamNotFound',
  'Only approved players can have a role': 'teams.errors.roleNeedsApproval',
  'Assign a team before making this player captain': 'teams.errors.captainNeedsTeam',
  'This team already has a captain': 'teams.errors.captainTaken',
  'Choose a current administrator': 'teams.errors.buyInAdmin',
  'This registration changed meanwhile. Reload and try again': 'teams.errors.changed',
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
