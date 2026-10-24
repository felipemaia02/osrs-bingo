import AccountCircle from '@mui/icons-material/AccountCircle'
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined'
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import CoPresent from '@mui/icons-material/CoPresent'
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined'
import EventNote from '@mui/icons-material/EventNote'
import FactCheck from '@mui/icons-material/FactCheck'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import GridView from '@mui/icons-material/GridView'
import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import Groups from '@mui/icons-material/Groups'
import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import Leaderboard from '@mui/icons-material/Leaderboard'
import LeaderboardOutlined from '@mui/icons-material/LeaderboardOutlined'
import SpaceDashboard from '@mui/icons-material/SpaceDashboard'
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined'
import Style from '@mui/icons-material/Style'
import StyleOutlined from '@mui/icons-material/StyleOutlined'
import UploadFile from '@mui/icons-material/UploadFile'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import ViewModule from '@mui/icons-material/ViewModule'
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined'

type IconComponent = typeof GridView

/** A sidebar/bottom-bar destination. `to: null` marks a feature that isn't available yet. */
export interface NavEntry {
  key: string
  labelKey: string
  to: string | null
  /** Outlined icon for the neutral state, filled icon for the active state. */
  icon: IconComponent
  activeIcon: IconComponent
  /** Exact match only (index routes such as `/` and `/admin`). */
  exact?: boolean
  /** Hidden from the mobile bottom bar (reached from the account menu instead). */
  desktopOnly?: boolean
}

export const PLAY_ENTRIES: NavEntry[] = [
  {
    key: 'board',
    labelKey: 'navigation.board',
    to: '/',
    icon: GridViewOutlined,
    activeIcon: GridView,
    exact: true,
  },
  {
    key: 'events',
    labelKey: 'navigation.events',
    to: '/events',
    icon: CalendarMonthOutlined,
    activeIcon: CalendarMonth,
    exact: true,
  },
  {
    key: 'profile',
    labelKey: 'navigation.profile',
    to: '/profile',
    icon: AccountCircleOutlined,
    activeIcon: AccountCircle,
    desktopOnly: true,
  },
  {
    key: 'submissions',
    labelKey: 'navigation.mySubmissions',
    to: '/submissions',
    icon: UploadFileOutlined,
    activeIcon: UploadFile,
  },
]

export const ADMIN_ENTRIES: NavEntry[] = [
  {
    key: 'overview',
    labelKey: 'admin.overview',
    to: '/admin',
    icon: SpaceDashboardOutlined,
    activeIcon: SpaceDashboard,
    exact: true,
  },
  {
    key: 'review',
    labelKey: 'admin.review',
    to: '/admin/review',
    icon: FactCheckOutlined,
    activeIcon: FactCheck,
  },
  {
    key: 'adminEvents',
    labelKey: 'admin.events',
    to: '/admin/events',
    icon: EventNoteOutlined,
    activeIcon: EventNote,
  },
  {
    key: 'teams',
    labelKey: 'admin.teams',
    to: '/admin/teams',
    icon: GroupsOutlined,
    activeIcon: Groups,
  },
  {
    key: 'draft',
    labelKey: 'admin.draft',
    to: '/admin/draft',
    icon: CoPresentOutlined,
    activeIcon: CoPresent,
  },
  {
    key: 'cards',
    labelKey: 'admin.cards',
    to: '/admin/cards',
    icon: StyleOutlined,
    activeIcon: Style,
  },
  {
    key: 'boards',
    labelKey: 'admin.boards',
    to: '/admin/boards',
    icon: ViewModuleOutlined,
    activeIcon: ViewModule,
  },
  {
    key: 'administrators',
    labelKey: 'admin.administrators',
    to: '/admin/administrators',
    icon: AdminPanelSettingsOutlined,
    activeIcon: AdminPanelSettings,
  },
  {
    key: 'ranking',
    labelKey: 'admin.ranking',
    to: '/admin/ranking',
    icon: LeaderboardOutlined,
    activeIcon: Leaderboard,
  },
]

export function isEntryActive(entry: NavEntry, pathname: string): boolean {
  if (!entry.to) return false
  return entry.exact ? pathname === entry.to : pathname.startsWith(entry.to)
}
