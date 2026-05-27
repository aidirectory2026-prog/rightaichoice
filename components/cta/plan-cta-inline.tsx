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
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import { isEligibleForCTA } from '@/lib/cta/eligible-path'
import { analytics } from '@/lib/analytics'
import { TOOL_COUNT_DISPLAY } from '@/lib/copy/tool-count'
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

  const headline = context
    ? `Researching ${context}? Skip the guesswork.`
    : 'Stop tab-hopping through 50 AI review sites.'

  return (
    <section
      ref={ref}
      className="my-10 overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-900/70 p-6 sm:p-8 shadow-lg shadow-emerald-950/30"
      aria-label="Plan your AI stack"
    >
      {/* Kicker row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
          AI stack planner · Free · 60 seconds
        </span>
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
        {headline}
      </h3>

      {/* Description — ~115 words */}
      <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
        Describe what you&apos;re building in plain English — the goal, your budget,
        the tools you already use. We cross-reference {TOOL_COUNT_DISPLAY} AI tools and
        come back with the exact stack that fits: the best pick per stage, a
        runner-up to consider, the real monthly cost, integration matches, and
        the trade-offs nobody else mentions. Most people walk away with a
        better-fit stack than the one they were originally going to buy — and
        skip the $200/mo mistakes that come from picking the loudest tool
        instead of the right one. Free to use, no signup required to see your
        plan, and your answer arrives in under a minute.
      </p>

      {/* Mini value-prop row + CTA */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-400">
          <li className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-emerald-400" aria-hidden />
            Personalised to your budget
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-emerald-400" aria-hidden />
            Real pricing &amp; integrations
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-emerald-400" aria-hidden />
            No credit card
          </li>
        </ul>
        <PlanCTAButton surface="inline_card" pagePath={pathname ?? ''}>
          {({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors shadow-md shadow-emerald-950/40 whitespace-nowrap"
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
