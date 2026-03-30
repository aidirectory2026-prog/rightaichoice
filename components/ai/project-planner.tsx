'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react'
import { ShareButton } from '@/components/shared/share-button'
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
  'Build a SaaS CRM tool from scratch',
  'Create and automate Instagram content',
  'Start a YouTube channel',
  'Launch an e-commerce store',
  'Write and publish a book',
  'Build a mobile app for food delivery',
  'Create a podcast from scratch',
  'Automate my email marketing workflow',
]

export function ProjectPlanner({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openStages, setOpenStages] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(q?: string) {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery || loading) return

    setQuery(searchQuery)
    setLoading(true)
    setError('')
    setPlan(null)
    setOpenStages(new Set())

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
      // Open first two stages by default
      if (data.stages?.length > 0) {
        setOpenStages(new Set([data.stages[0].id, data.stages[1]?.id].filter(Boolean)))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
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
      {/* Input */}
      {!plan && !loading && (
        <div className="space-y-6">
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="I want to build a CRM / automate my Instagram / launch a YouTube channel..."
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-600 transition-colors"
              autoFocus={!initialQuery}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim()}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Plan it</span>
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Example queries */}
          <div>
            <p className="text-xs text-zinc-500 mb-3">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-emerald-800 border-t-emerald-400 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Planning your AI stack...</p>
            <p className="text-xs text-zinc-500 mt-1">
              Breaking down your goal into stages and finding the best tools for each
            </p>
          </div>
        </div>
      )}

      {/* Plan result */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Plan header */}
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    AI-Generated Plan
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{plan.title}</h2>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{plan.summary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton
                  url={`/plan?q=${encodeURIComponent(query)}`}
                  title={plan.title}
                  text={`My AI tool plan for: ${query} — built with RightAIChoice`}
                  variant="button"
                  size="sm"
                />
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New plan</span>
                </button>
              </div>
            </div>

            {/* Stage count indicator */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              {plan.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleStage(stage.id)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      openStages.has(stage.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
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

          {/* Stages */}
          <div className="space-y-3">
            {plan.stages.map((stage, i) => (
              <div
                key={stage.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                {/* Stage header */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-900/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{stage.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-600">
                      {stage.tools.length} tool{stage.tools.length !== 1 ? 's' : ''}
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
                  <div className="border-t border-zinc-800 p-5">
                    {stage.why && (
                      <p className="text-xs text-zinc-500 mb-4 leading-relaxed italic">
                        {stage.why}
                      </p>
                    )}

                    {stage.tools.length === 0 ? (
                      <p className="text-sm text-zinc-600">No tools found for this stage.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {stage.tools.map((tool, ti) => (
                          <div
                            key={tool.slug}
                            className={`relative rounded-xl border p-4 ${
                              ti === 0
                                ? 'border-emerald-900/60 bg-emerald-950/20'
                                : 'border-zinc-800 bg-zinc-950/30'
                            }`}
                          >
                            {ti === 0 && (
                              <span className="absolute top-3 right-3 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-1.5 py-0.5 rounded">
                                Best fit
                              </span>
                            )}

                            <Link
                              href={`/tools/${tool.slug}`}
                              className="block"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 mb-3">
                                <span className="text-sm font-bold text-zinc-400">
                                  {tool.name.charAt(0)}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
                                {tool.name}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {tool.tagline}
                              </p>
                            </Link>

                            {/* Why this stage */}
                            {tool.whyThisStage && (
                              <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800 pt-2.5">
                                {tool.whyThisStage}
                              </p>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              <span className={`text-[11px] font-medium rounded px-1.5 py-0.5 ${pricingColor(tool.pricing)}`}>
                                {pricingLabel(tool.pricing)}
                              </span>
                              {tool.rating > 0 && (
                                <div className="flex items-center gap-1 text-xs text-zinc-600">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span>{tool.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-500">
              Want to explore tools more? Browse our full directory or get personalized AI recommendations.
            </p>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/tools"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Browse all tools
              </Link>
              <Link
                href="/recommend"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
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
