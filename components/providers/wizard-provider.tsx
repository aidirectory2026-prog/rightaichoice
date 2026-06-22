'use client'

/**
 * Phase 12 Bug-1 — global mount point for the stepped "plan your stack" wizard.
 *
 * Mounted once in app/layout.tsx (inside AuthProvider) so ANY CTA on ANY page
 * can open the same full-screen takeover via `useWizard().openWizard(...)`.
 * The provider only owns open/closed + the launch params; all of the screen
 * logic + tracking lives in <StackWizard>.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { StackWizard } from '@/components/cta/stack-wizard'

export type WizardSurface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'

/** Where the wizard opens. 'goal' = start from the goal screen; 'skill' = the
 *  caller already has a typed goal (homepage hero) so jump to the first question. */
export type WizardStartStep = 'goal' | 'skill'

export type OpenWizardOptions = {
  /** Pre-filled goal carried in from the hero box (skips re-asking). */
  initialGoal?: string
  sourceSurface: WizardSurface
  /** Default 'goal'. Homepage passes 'skill' since the goal is already typed. */
  startAtStep?: WizardStartStep
  /** Page the user launched from → plan_intents.source_path. */
  originalPagePath?: string
}

type WizardContextValue = {
  openWizard: (opts: OpenWizardOptions) => void
  closeWizard: () => void
  isOpen: boolean
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<OpenWizardOptions | null>(null)

  const openWizard = useCallback((next: OpenWizardOptions) => {
    setOpts(next)
  }, [])

  const closeWizard = useCallback(() => {
    setOpts(null)
  }, [])

  const value = useMemo<WizardContextValue>(
    () => ({ openWizard, closeWizard, isOpen: opts !== null }),
    [openWizard, closeWizard, opts],
  )

  return (
    <WizardContext.Provider value={value}>
      {children}
      {opts && <StackWizard options={opts} onClose={closeWizard} />}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within WizardProvider')
  return ctx
}
