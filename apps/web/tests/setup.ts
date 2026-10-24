import '@testing-library/jest-dom'

// jsdom has no object URLs; the screenshot preview only needs a stable string.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:preview'
  URL.revokeObjectURL = () => undefined
}

vi.mock('../src/features/events/api/eventsApi', () => ({
  fetchEvents: vi.fn().mockResolvedValue([]),
  fetchMyEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  updateEventRules: vi.fn(),
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
  fetchPlayers: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    offset: 0,
    limit: 25,
    counts: { pending: 0, unassigned: 0, assigned: 0 },
  }),
  fetchOwnRegistration: vi.fn().mockResolvedValue(null),
  createPlayer: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  updatePlayer: vi.fn(),
  approvePlayer: vi.fn(),
  approveAllPlayers: vi.fn(),
  removePlayer: vi.fn(),
  approveSelectedPlayers: vi.fn(),
  removeSelectedPlayers: vi.fn(),
  fetchTeamBalance: vi.fn().mockResolvedValue({ average_ehb: 0, teams: [] }),
  fetchDraftPreview: vi.fn().mockResolvedValue({ captains: [], players: [] }),
  updateParticipation: vi.fn(),
}))

vi.mock('../src/features/administration/api/administrationApi', () => ({
  fetchUsers: vi
    .fn()
    .mockResolvedValue({ items: [], total: 0, offset: 0, limit: 25, admin_count: 1 }),
  changeRole: vi.fn(),
  fetchAdministrators: vi.fn().mockResolvedValue([]),
}))

vi.mock('../src/features/cards/api/cardsApi', () => ({
  fetchCards: vi.fn().mockResolvedValue([]),
  createCard: vi.fn(),
  createCardRevision: vi.fn(),
  retireCard: vi.fn(),
  importWorkbookCatalog: vi.fn(),
  resolveWikiImage: vi.fn(),
}))

vi.mock('../src/features/boards/api/boardsApi', () => ({
  fetchAdminBoard: vi.fn().mockResolvedValue(null),
  fetchPublicBoard: vi.fn().mockResolvedValue(null),
  saveBoard: vi.fn(),
}))

vi.mock('../src/features/submissions/api/submissionsApi', () => ({
  fetchOwnSubmissions: vi.fn().mockResolvedValue({
    items: [],
    counts: { all: 0, pending: 0, accepted: 0, rejected: 0 },
  }),
  createSubmission: vi.fn(),
  screenshotUrl: (id: string) => `http://localhost:8000/submissions/${id}/screenshot`,
  fetchReviewQueue: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    offset: 0,
    limit: 50,
    counts: { pending: 0, pending_preverification: 0, pending_drop: 0 },
  }),
  acceptSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
}))

vi.mock('../src/features/scoring/api/scoringApi', () => ({
  // Default: the viewer isn't on a team, so the board shows no progress.
  fetchOwnTeamScore: vi.fn().mockRejectedValue(new Error('Not on a team')),
  fetchRanking: vi.fn(),
}))

vi.mock('../src/features/profiles/api/profileApi', () => ({
  fetchProfile: vi.fn(),
  savePreferences: vi.fn(),
  addAccount: vi.fn(),
  runAccountAction: vi.fn(),
  searchMembers: vi.fn().mockResolvedValue([]),
}))

vi.mock('../src/features/maintenance/siteStatusApi', () => ({
  fetchSiteStatus: vi.fn().mockResolvedValue({ maintenance: false, message: null }),
}))
