'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  RefreshCw,
  Send,
  Zap,
  ExternalLink,
  Trophy,
} from 'lucide-react'
import { SaveStackButton } from '@/components/stacks/save-stack-button'
import { ExportStack } from '@/components/stacks/export-stack'
import { pricingLabel, pricingColor } from '@/lib/utils'

type PlanTool = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
  whyThisStage: string
}

type PlanStage = {
  id: string
  name: string
  description: string
  why: string
  tools: PlanTool[]
}

type Plan = {
  title: string
  summary: string
  stages: PlanStage[]
}

const EXAMPLE_QUERIES = [
  { label: 'SaaS CRM tool', query: 'Build a SaaS CRM tool from scratch' },
  { label: 'Instagram content', query: 'Create and automate Instagram content' },
  { label: 'YouTube channel', query: 'Start a YouTube channel' },
  { label: 'E-commerce store', query: 'Launch an e-commerce store' },
  { label: 'Publish a book', query: 'Write and publish a book' },
  { label: 'Mobile app', query: 'Build a mobile app for food delivery' },
  { label: 'Podcast', query: 'Create a podcast from scratch' },
  { label: 'Email marketing', query: 'Automate my email marketing workflow' },
]

// Loading steps for animated progress
const LOADING_STEPS = [
  'Understanding your goal...',
  'Breaking down into stages...',
  'Finding the best AI tools...',
  'Matching tools to stages...',
  'Generating recommendations...',
]

export function ProjectPlanner({
  initialQuery,
  isLoggedIn = false,
}: {
  initialQuery?: string
  isLoggedIn?: boolean
}) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openStages, setOpenStages] = useState<Set<string>>(new Set())
  const [loadingStep, setLoadingStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  async function handleSubmit(q?: string) {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery || loading) return

    setQuery(searchQuery)
    setLoading(true)
    setError('')
    setPlan(null)
    setOpenStages(new Set())
    setLoadingStep(0)

    // Animated loading steps
    let step = 0
    loadingInterval.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1)
      setLoadingStep(step)
    }, 1800)

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.')
        return
      }

      setPlan(data)
      // Open all stages by default for better UX
      if (data.stages?.length > 0) {
        setOpenStages(new Set(data.stages.map((s: PlanStage) => s.id)))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      clearInterval(loadingInterval.current)
    }
  }

  function toggleStage(id: string) {
    setOpenStages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleReset() {
    setPlan(null)
    setQuery('')
    setError('')
    setOpenStages(new Set())
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="w-full">
      {/* ─── Input State ─── */}
      {!plan && !loading && (
        <div className="space-y-8">
          {/* Search input */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/80 backdrop-blur-sm p-2 focus-within:border-emerald-700/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="I want to build a CRM / automate my Instagram / launch a YouTube channel..."
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                autoFocus={!initialQuery}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!query.trim()}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/30"
              >
                <Zap className="h-4 w-4" />
                <span>Plan it</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Example queries */}
          <div>
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-3">
              Popular plans
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((eq) => (
                <button
                  key={eq.query}
                  onClick={() => handleSubmit(eq.query)}
                  className="group/tag rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs text-zinc-500 hover:border-emerald-800/50 hover:text-emerald-400 hover:bg-emerald-950/20 transition-all"
                >
                  <span className="opacity-60 group-hover/tag:opacity-100 transition-opacity">
                    {eq.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="py-16">
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Animated spinner */}
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-900/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-teal-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-emerald-400" />
            </div>

            {/* Progress steps */}
            <div className="space-y-2 text-center">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`flex items-center justify-center gap-2 text-sm transition-all duration-500 ${
                    i < loadingStep
                      ? 'text-emerald-600 line-through'
                      : i === loadingStep
                        ? 'text-white font-medium'
                        : 'text-zinc-700'
                  }`}
                >
                  {i < loadingStep ? (
                    <span className="text-emerald-500">&#10003;</span>
                  ) : i === loadingStep ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                  {step}
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-600">
              Analyzing <span className="text-zinc-500">&ldquo;{query}&rdquo;</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Plan Result ─── */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Plan header card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 to-zinc-900/50 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Your AI Stack Plan
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">
                  {plan.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-2xl">
                  {plan.summary}
                </p>

                {/* Stage pills */}
                <div className="mt-5 flex items-center gap-1.5 flex-wrap">
                  {plan.stages.map((stage, i) => (
                    <div key={stage.id} className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleStage(stage.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          openStages.has(stage.id)
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-700/50'
                            : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {i + 1}. {stage.name}
                      </button>
                      {i < plan.stages.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <SaveStackButton
                  title={plan.title}
                  goal={query}
                  description={plan.summary}
                  stages={plan.stages.map((s) => ({
                    name: s.name,
                    description: s.description,
                    bestPick: s.tools[0]
                      ? {
                          name: s.tools[0].name,
                          slug: s.tools[0].slug,
                          reason: s.tools[0].whyThisStage,
                          pricing: s.tools[0].pricing,
                        }
                      : { name: '', slug: '', reason: '', pricing: '' },
                    alternatives: s.tools.slice(1).map((t) => ({
                      name: t.name,
                      slug: t.slug,
                      reason: t.whyThisStage,
                      pricing: t.pricing,
                    })),
                    costEstimate: '',
                  }))}
                  source="planner"
                  isLoggedIn={isLoggedIn}
                />
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New plan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="space-y-4">
            {plan.stages.map((stage, i) => (
              <div
                key={stage.id}
                className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden hover:border-zinc-700/80 transition-colors"
              >
                {/* Stage header */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 text-sm font-bold text-zinc-300 shadow-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {stage.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline text-xs text-zinc-600 bg-zinc-800/50 rounded-full px-2.5 py-1">
                      {stage.tools.length} tool
                      {stage.tools.length !== 1 ? 's' : ''}
                    </span>
                    {openStages.has(stage.id) ? (
                      <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Stage content */}
                {openStages.has(stage.id) && (
                  <div className="border-t border-zinc-800/60 p-5">
                    {stage.why && (
                      <p className="text-xs text-zinc-500 mb-5 leading-relaxed pl-3 border-l-2 border-zinc-800 italic">
                        {stage.why}
                      </p>
                    )}

                    {stage.tools.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-6 text-center">
                        <p className="text-sm text-zinc-600">
                          No matching tools found for this stage.
                        </p>
                        <Link
                          href="/tools"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          Browse all tools
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {stage.tools.map((tool, ti) => (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className={`group/card relative rounded-xl border p-4 transition-all hover:scale-[1.01] hover:shadow-lg ${
                              ti === 0
                                ? 'border-emerald-800/50 bg-gradient-to-br from-emerald-950/30 to-zinc-900/50 hover:border-emerald-700/60 shadow-emerald-950/20'
                                : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700'
                            }`}
                          >
                            {ti === 0 && (
                              <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900/50 px-2 py-0.5 rounded-full">
                                <Trophy className="h-2.5 w-2.5" />
                                Best pick
                              </span>
                            )}

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700/50 mb-3">
                              <span className="text-sm font-bold text-zinc-300">
                                {tool.name.charAt(0)}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-white group-hover/card:text-emerald-400 transition-colors">
                              {tool.name}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                              {tool.tagline}
                            </p>

                            {tool.whyThisStage && (
                              <p className="mt-3 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                                {tool.whyThisStage}
                              </p>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              <span
                                className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${pricingColor(tool.pricing)}`}
                              >
                                {pricingLabel(tool.pricing)}
                              </span>
                              {tool.rating > 0 && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span>{tool.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Export row */}
          <div className="flex items-center gap-3">
            <ExportStack
              title={plan.title}
              goal={query}
              stages={plan.stages.map((s) => ({
                name: s.name,
                bestPick: {
                  name: s.tools[0]?.name ?? '',
                  pricing: s.tools[0]?.pricing ?? '',
                },
                alternatives: s.tools.slice(1).map((t) => ({ name: t.name })),
              }))}
              shareUrl={`/plan?q=${encodeURIComponent(query)}`}
            />
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
            <p className="text-sm text-zinc-500">
              Want to explore more tools or get personalized recommendations?
            </p>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/tools"
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Browse all tools
              </Link>
              <Link
                href="/recommend"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Get recommendations
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
