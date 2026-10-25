import { createTheme } from '@mui/material/styles'

/**
 * MUI components (date picker, menus, modals) in the RuneScape palette.
 * Values mirror the `rs-*` tokens in tailwind.config.js / docs/design/design-system.md.
 */
const RS = {
  canvas: '#15110e',
  surface: '#211914',
  raised: '#2d2119',
  border: '#705a39',
  gold: '#d4ad53',
  goldBright: '#f1d487',
  text: '#ead9b7',
  muted: '#aa9a7c',
  disabled: '#9a8b70',
  danger: '#b45b4e',
} as const

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: RS.gold, light: RS.goldBright, contrastText: RS.canvas },
    error: { main: RS.danger },
    text: { primary: RS.text, secondary: RS.muted, disabled: RS.disabled },
    background: { default: RS.canvas, paper: RS.surface },
    divider: RS.border,
    action: { hover: RS.raised, selected: RS.raised },
  },
  typography: { fontFamily: '"Inter", system-ui, sans-serif' },
  components: {
    // Dark-mode papers get a white overlay by default; keep the flat panel color.
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})
