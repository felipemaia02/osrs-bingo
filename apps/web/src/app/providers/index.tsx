import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DateLocalizationProvider } from './DateLocalizationProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DateLocalizationProvider>{children}</DateLocalizationProvider>
    </QueryClientProvider>
  )
}
