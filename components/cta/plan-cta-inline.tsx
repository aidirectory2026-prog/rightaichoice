'use client'

/**
 * Phase 9 — Inline "Plan Your Stack" CTA card.
 *
 * Dropped inside article/detail templates (after the first content section
 * on /tools/[slug], /categories/[slug], /best/[slug], /blog/[slug] etc.)
 * Wider + more contextual than the sticky bar. Accepts an optional
 * `context` prop so each template can craft a relevant hook ("Building
 * with {tool}? Get a personalised stack…").
 *
 * Click → opens the PlanSignupModal for anon users (Stage 3) or goes
 * straight to /plan for authenticated users.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'
import { isEligibleForCTA } from '@/lib/cta/eligible-path'
import { analytics } from '@/lib/analytics'
import { PlanCTAButton } from './plan-cta-button'

type Props = {
  /**
   * Short context word/phrase woven into the headline. Examples:
   *   tool detail:   "Notion AI"           → "Considering Notion AI? …"
   *   category:      "AI writing tools"    → "Picking the right AI writing tools? …"
   *   best-of:       "best AI for coding"  → "Looking for the best AI for coding? …"
   */
  context?: string
}

export function PlanCTAInline({ context }: Props) {
  const pathname = usePathname()
  const impressionFiredRef = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  const eligible = isEligibleForCTA(pathname)

  // IntersectionObserver — only fire impression when the card actually
  // scrolls into view, not on mount (which would fire below-the-fold).
  useEffect(() => {
    if (!eligible || !ref.current || impressionFiredRef.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !impressionFiredRef.current) {
            impressionFiredRef.current = true
            analytics.planCtaImpression({ surface: 'inline_card', page_path: pathname ?? '' })
            obs.disconnect()
          }
        }
      },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [eligible, pathname])

  if (!eligible) return null

  const headline = context
    ? `Researching ${context}?`
    : 'Stop guessing which AI tools to use.'

  return (
    <section
      ref={ref}
      className="my-8 rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-900/60 p-5 sm:p-6"
      aria-label="Plan your AI stack"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {headline}
          </h3>
          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
            Describe what you're building. We'll match the right AI stack in 60 seconds — pricing, alternatives, hidden costs, all in one place.
          </p>
        </div>
        <PlanCTAButton surface="inline_card" pagePath={pathname ?? ''}>
          {({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              Plan my stack
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </PlanCTAButton>
      </div>
    </section>
  )
}
