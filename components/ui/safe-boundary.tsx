'use client'

import { Component, type ReactNode } from 'react'

/**
 * SafeBoundary — isolates a NON-ESSENTIAL global widget so that if it throws
 * (render or hydration), it quietly renders nothing instead of taking the whole
 * page down with it.
 *
 * Why this exists: layout-level widgets (sticky CTAs, trackers, nav) are siblings
 * of the page content in the React tree, so an uncaught throw in any one of them
 * unmounts everything — a blank page. (That's exactly what a misplaced
 * PlanCTASticky → useWizard() did to every tool/compare page.) Wrapping each such
 * widget here contains the blast radius to that one widget. The route-level
 * app/error.tsx still handles errors inside the page content itself.
 *
 * The error is still surfaced to the console (and thus Sentry) — we hide the
 * broken UI, we don't hide the bug.
 */
export class SafeBoundary extends Component<
  { children: ReactNode; name?: string },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[SafeBoundary${this.props.name ? `:${this.props.name}` : ''}] non-essential widget threw —`, error)
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}
