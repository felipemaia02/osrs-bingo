import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
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
