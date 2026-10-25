import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CrashScreen } from './StatusScreens'

/** Shows the "You are dead!" screen instead of a blank page when rendering fails. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack)
  }

  render() {
    return this.state.crashed ? <CrashScreen /> : this.props.children
  }
}
