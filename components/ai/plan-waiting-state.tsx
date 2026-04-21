'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Zap, Layers, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react'

/**
 * PlanWaitingState
 * Shown while /api/plan is generating a stack. Replaces the bare spinner with:
 *  - a confident, generous headline framing the wait as depth
 *  - a visible countdown timer anchored to ~10s (degrades to "Almost there")
 *  - rotating teaser cards so the user has something to absorb during the wait
 *  - a subtle progress ticker grounded in the real pipeline stages
 */

const TARGET_SECONDS = 10

const TEASERS: Array<{ icon: typeof Sparkles; title: string; body: string }> = [
  {
    icon: Layers,
    title: 'Matching across 1,500+ tools',
    body: 'We weigh pricing, skill level, integrations, and real user sentiment — not just tags.',
  },
  {
    icon: TrendingUp,
    title: 'Trending picks included',
    body: 'Tools released or updated in the last 90 days get priority when they clearly outperform.',
  },
  {
    icon: Zap,
    title: 'Built for your profile',
    body: 'Your experience level and budget shape the final ranking, not just your prompt.',
  },
  {
    icon: Sparkles,
    title: 'Verdicts, not listicles',
    body: 'Each tool comes with a one-line verdict and a reason it fits this exact stage.',
  },
  {
    icon: CheckCircle2,
    title: 'No dead wrappers',
    body: 'Every tool on the shortlist passes a viability gate — active, maintained, and in real use.',
  },
]

const STAGES = [
  'Reading your goal',
  'Breaking it into stages',
  'Scanning 1,500+ tools',
  'Scoring for your profile',
  'Assembling the stack',
]

export function PlanWaitingState({ query }: { query: string }) {
  const [elapsed, setElapsed] = useState(0)
  const [teaserIdx, setTeaserIdx] = useState(0)

  // 1-second elapsed ticker
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Rotate teasers every 3.5s
  useEffect(() => {
    const id = setInterval(() => setTeaserIdx((i) => (i + 1) % TEASERS.length), 3500)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, TARGET_SECONDS - elapsed)
  const overTime = elapsed > TARGET_SECONDS
  const progressPct = Math.min(98, (elapsed / TARGET_SECONDS) * 100)

  // Which "stage" label to show as current — scales with elapsed time
  const currentStage = useMemo(() => {
    const n = STAGES.length
    const idx = Math.min(n - 1, Math.floor((elapsed / TARGET_SECONDS) * n))
    return idx
  }, [elapsed])

  const teaser = TEASERS[teaserIdx]
  const TeaserIcon = teaser.icon

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center space-y-8">
        {/* Headline + timer row */}
        <div className="w-full text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Crafting your stack
          </div>

          <h2 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Analyzing 1,500+ AI tools to build your exact stack
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            For <span className="font-medium text-zinc-300">&ldquo;{query}&rdquo;</span>
          </p>
        </div>

        {/* Countdown + progress bar */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-300">
              {overTime ? 'Almost there…' : `~${remaining}s remaining`}
            </span>
            <span className="text-zinc-500">
              {STAGES[currentStage]}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/70"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Plan generation progress"
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Rotating teaser card */}
        <div
          key={teaserIdx}
          className="waiting-teaser w-full rounded-2xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/40 via-zinc-950/60 to-zinc-900/40 p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-800/40 bg-emerald-950/50">
              <TeaserIcon className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{teaser.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{teaser.body}</p>
            </div>
          </div>

          {/* Teaser dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {TEASERS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === teaserIdx ? 'w-6 bg-emerald-400' : 'w-1 bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quiet spinner to signal liveness without dominating */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400/70" />
          Live analysis · updates streaming in
        </div>
      </div>

      <style jsx>{`
        .waiting-teaser {
          animation: teaser-fade 420ms ease-out;
        }
        @keyframes teaser-fade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .waiting-teaser {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
