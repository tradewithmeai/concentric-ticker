/**
 * React Error Boundary component for graceful error handling
 */

import React, { Component, ReactNode } from 'react'
import { Button } from '../ui/button'

interface Props {
  children: ReactNode
  resetKey?: number
}

interface State {
  hasError: boolean
  detail?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store minimal error detail without console spam in production
    const detail = `${error.message} (${error.name})`
    this.setState({ detail })
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKey changes
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, detail: undefined })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, detail: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              We're sorry, but something unexpected happened. You can try again or reload the page.
            </p>
            {this.state.detail && (
              <details className="mb-6 text-sm text-gray-400">
                <summary className="cursor-pointer hover:text-gray-300 mb-2">Error details</summary>
                <code className="block bg-gray-900 p-2 rounded text-left">{this.state.detail}</code>
              </details>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={this.handleReset} variant="default">
                Try again
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
