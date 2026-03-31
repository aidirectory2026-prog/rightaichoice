'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = {
  children: ReactNode
  fallbackTitle?: string
}

type State = {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">
            {this.props.fallbackTitle ?? 'This section couldn\u2019t load.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
