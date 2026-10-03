import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DateLocalizationProvider } from '../src/app/providers/DateLocalizationProvider'

export function renderApp(element: ReactElement, route = '/') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <DateLocalizationProvider>
                <MemoryRouter
                    initialEntries={[route]}
                    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
                    {element}
                </MemoryRouter>
            </DateLocalizationProvider>
        </QueryClientProvider>,
    )
}
