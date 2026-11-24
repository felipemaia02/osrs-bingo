import type { ReactNode } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'

export interface RuleSummaryItem {
  key: string
  icon: ReactNode
}

const ICON_SX = { fontSize: 18 }

/** The fixed bingo rules every event shares (join wizard, home and rules page). */
const RULE_SUMMARY: RuleSummaryItem[] = [
  { key: 'board', icon: <GridViewOutlinedIcon sx={ICON_SX} /> },
  { key: 'progress', icon: <TrendingUpOutlinedIcon sx={ICON_SX} /> },
  { key: 'screenshots', icon: <AddPhotoAlternateOutlinedIcon sx={ICON_SX} /> },
  { key: 'teams', icon: <GroupsOutlinedIcon sx={ICON_SX} /> },
  { key: 'buyIn', icon: <PaymentsOutlinedIcon sx={ICON_SX} /> },
]

/** Events without a buy-in don't mention it (feature 025 follow-up). */
export function ruleSummary(hasBuyIn: boolean): RuleSummaryItem[] {
  return RULE_SUMMARY.filter((item) => hasBuyIn || item.key !== 'buyIn')
}
