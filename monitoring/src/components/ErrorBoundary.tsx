"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-md w-full mx-4 p-6 bg-slate-900 border border-red-500/20 rounded-lg">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <details className="text-sm text-slate-400 mb-4 whitespace-pre-wrap font-mono">
              {this.state.error && this.state.error.toString()}
            </details>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary