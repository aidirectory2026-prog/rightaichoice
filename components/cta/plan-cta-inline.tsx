'use client'

/**
 * Phase 9 — Inline "Plan Your Stack" CTA card.
 *
 * Updated 2026-05-28: card expanded to a full title + ~100-word description
 * + CTA layout per the new spec. The click now navigates the user to /plan
 * with the source surface + originating page encoded — the signup gate
 * fires later on /plan, only after the user types a goal and submits.
 *
 * Dropped inside article/detail templates (after the first content section
 * on /tools/[slug], /categories/[slug], /best/[slug], /blog/[slug] etc.)
 * Accepts an optional `context` prop so each template can craft a relevant
 * headline ("Researching {tool}?", "Picking the right AI for {category}?").
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
   *   tool detail:   "Notion AI"           → "Researching Notion AI? …"
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

  // Dept B copy pass — baseline CTR was 0.37% with "Skip the guesswork" +
  // "Plan my stack". New framing sells the concrete output (a ranked stack),
  // the price (free) and the effort (60 seconds, no signup). Measured per
  // surface on /admin/plan-conversion.
  const headline = context
    ? `Researching ${context}? Get your full AI stack in 60 seconds.`
    : 'Get a ranked AI stack for your exact goal — in 60 seconds.'

  return (
    <section
      ref={ref}
      className="my-6 overflow-hidden rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-900/50 p-4"
      aria-label="Plan your AI stack"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
            {headline}
          </h3>
          {/* Short human-voice description — one line, ~18 words. */}
          <p className="mt-0.5 text-xs sm:text-[13px] text-zinc-400 leading-snug">
            Free, no signup — tell us your goal and get tools matched to your
            budget &amp; existing stack.
          </p>
        </div>

        {/* CTA */}
        <PlanCTAButton surface="inline_card" pagePath={pathname ?? ''}>
          {({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="shrink-0 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              Get my free stack
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </PlanCTAButton>
      </div>
    </section>
  )
}
