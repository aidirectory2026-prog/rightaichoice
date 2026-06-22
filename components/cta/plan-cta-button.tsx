'use client'

/**
 * Phase 9 — Shared Plan-Your-Stack CTA button (used by inline + sticky cards).
 *
 * Updated 2026-05-28: no longer opens the signup modal directly. The CTA on
 * a content page (e.g. /tools/leena-ai) now navigates the user to /plan with
 * the source surface + originating page encoded in the URL. The signup gate
 * fires later, on /plan, only AFTER the user types a goal and submits.
 *
 * Why: the user has no goal typed yet when they click an inline/sticky CTA,
 * so popping a signup is friction with nothing to save. Letting them land on
 * /plan, type their goal, then asking for signup at submit is the higher-
 * intent moment — and the typed goal still gets captured to plan_intents
 * regardless of signup outcome via the modal Skip path.
 *
 * The visual button is rendered via a render-prop so each parent can style
 * the trigger however it wants (compact emerald pill, large CTA, etc.) while
 * sharing identical click + analytics behavior.
 */

import { type ReactNode } from 'react'
import { analytics } from '@/lib/analytics'
import { useWizard } from '@/components/providers/wizard-provider'

type Surface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'

type Props = {
  surface: Surface
  /** Page the CTA was rendered on (becomes ?from= on the /plan URL so
   *  plan_intents.source_path reflects the original page, not /plan). */
  pagePath: string
  /** Render-prop: parent supplies the visual button + onClick wiring. */
  children: (props: { onClick: () => void; disabled?: boolean }) => ReactNode
}

export function PlanCTAButton({ surface, pagePath, children }: Props) {
  const { openWizard } = useWizard()

  function handleClick() {
    analytics.planCtaClicked({ surface, page_path: pagePath })
    // Phase 12 Bug-1 — open the stepped wizard in place (was: navigate to /plan).
    // No goal is typed yet on a content-page CTA, so start at the goal screen.
    // `surface` + `pagePath` flow into plan_intents (source_surface / source_path)
    // exactly as before; the wizard navigates to /plan?…&ready=1 at the end.
    openWizard({ sourceSurface: surface, startAtStep: 'goal', originalPagePath: pagePath })
  }

  return <>{children({ onClick: handleClick })}</>
}
