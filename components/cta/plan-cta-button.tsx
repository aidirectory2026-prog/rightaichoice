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
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'

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
  const router = useRouter()

  function handleClick() {
    analytics.planCtaClicked({ surface, page_path: pagePath })
    // Build /plan URL with provenance. `source` survives to plan_intents
    // via the planner's submit handler; `from` becomes the eventual
    // source_path so attribution points back to /tools/leena-ai rather
    // than /plan or /auth/callback.
    const params = new URLSearchParams({ source: surface })
    if (pagePath) params.set('from', pagePath)
    router.push(`/plan?${params.toString()}`)
  }

  return <>{children({ onClick: handleClick })}</>
}
