import '@testing-library/jest-dom'

vi.mock('../src/features/events/api/eventsApi', () => ({
  fetchEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  activateEvent: vi.fn(),
  finishEvent: vi.fn(),
}))

vi.mock('../src/features/auth/api/authApi', () => ({
  fetchSession: vi
    .fn()
    .mockResolvedValue({ id: 'admin-1', discord_id: '123', username: 'Admin', is_admin: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  discordLoginUrl: 'http://localhost:8000/auth/discord/login',
}))
vi.mock('../src/features/teams/api/teamsApi', () => ({
  fetchTeams: vi.fn().mockResolvedValue([]),
  fetchPlayers: vi.fn().mockResolvedValue([]),
  fetchOwnRegistration: vi.fn().mockResolvedValue(null),
  createPlayer: vi.fn(),
  createTeam: vi.fn(),
  updatePlayer: vi.fn(),
  approvePlayer: vi.fn(),
  approveAllPlayers: vi.fn(),
  removePlayer: vi.fn(),
}))

vi.mock('../src/features/administration/api/administrationApi', () => ({
  fetchUsers: vi.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 25 }),
  changeRole: vi.fn(),
}))
