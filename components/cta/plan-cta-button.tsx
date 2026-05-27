'use client'

/**
 * Phase 9 — Shared Plan-Your-Stack CTA button.
 *
 * One component, used by both PlanCTASticky and PlanCTAInline. Handles the
 * auth branch: anonymous users see the PlanSignupModal first; authenticated
 * users navigate straight to /plan.
 *
 * The visual button is rendered via a render-prop so each parent can style
 * the trigger however it wants (compact emerald pill, large CTA, etc.) while
 * sharing identical click + modal behavior.
 */

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { analytics } from '@/lib/analytics'
import { PlanSignupModal } from './plan-signup-modal'

type Surface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage'

type Props = {
  surface: Surface
  pagePath: string
  /** Optional pre-filled goal text (homepage hero passes the typed value). */
  typedGoal?: string
  /** Render-prop: parent supplies the visual button + onClick wiring. */
  children: (props: { onClick: () => void; disabled?: boolean }) => ReactNode
}

export function PlanCTAButton({ surface, pagePath, typedGoal = '', children }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)

  function handleClick() {
    analytics.planCtaClicked({ surface, page_path: pagePath })
    if (user?.id) {
      // Known user — straight to /plan with optional pre-fill.
      const url = typedGoal.trim()
        ? `/plan?q=${encodeURIComponent(typedGoal)}&source=${surface}`
        : `/plan?source=${surface}`
      router.push(url)
      return
    }
    // Anon — open modal (skippable, OAuth-only).
    setModalOpen(true)
  }

  return (
    <>
      {children({ onClick: handleClick })}
      <PlanSignupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        typedGoal={typedGoal}
        sourceSurface={surface}
      />
    </>
  )
}
