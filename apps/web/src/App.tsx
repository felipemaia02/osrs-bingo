import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/common/status/ErrorBoundary'
import { AppRouter } from './app/router'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
