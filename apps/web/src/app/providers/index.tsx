import { type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DateLocalizationProvider } from './DateLocalizationProvider'
import { muiTheme } from './muiTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <DateLocalizationProvider>{children}</DateLocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
