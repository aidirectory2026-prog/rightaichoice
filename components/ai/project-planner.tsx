'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Star,
  Loader2,
  RefreshCw,
  Zap,
  ExternalLink,
  Trophy,
  BarChart3,
  Clock,
  DollarSign,
  Layers,
  Package,
  TrendingUp,
  ChevronRight,
  Lightbulb,
  Target,
  CheckCircle2,
  CircleDot,
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
  { label: 'SaaS CRM tool', query: 'Build a SaaS CRM tool from scratch', icon: Target },
  { label: 'Instagram content', query: 'Create and automate Instagram content', icon: TrendingUp },
  { label: 'YouTube channel', query: 'Start a YouTube channel', icon: Zap },
  { label: 'E-commerce store', query: 'Launch an e-commerce store', icon: Package },
  { label: 'Publish a book', query: 'Write and publish a book', icon: Lightbulb },
  { label: 'Mobile app', query: 'Build a mobile app for food delivery', icon: Layers },
  { label: 'Podcast', query: 'Create a podcast from scratch', icon: BarChart3 },
  { label: 'Email marketing', query: 'Automate my email marketing workflow', icon: Clock },
]

const LOADING_STEPS = [
  'Understanding your goal...',
  'Breaking down into stages...',
  'Finding the best AI tools...',
  'Matching tools to stages...',
  'Generating recommendations...',
]

const RELATED_PLANS = [
  { label: 'Build a SaaS product', query: 'Build a SaaS product from idea to launch' },
  { label: 'Automate social media', query: 'Automate my social media content creation' },
  { label: 'Start a blog', query: 'Start a professional blog with AI tools' },
  { label: 'Design a brand', query: 'Design a complete brand identity' },
  { label: 'Build a chatbot', query: 'Build an AI chatbot for customer support' },
  { label: 'Create an online course', query: 'Create and sell an online course' },
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
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Computed stats from the plan
  const planStats = useMemo(() => {
    if (!plan) return null
    const allTools = plan.stages.flatMap((s) => s.tools)
    const uniqueTools = new Set(allTools.map((t) => t.slug))
    const freeTools = allTools.filter((t) => t.pricing === 'free').length
    const freemiumTools = allTools.filter((t) => t.pricing === 'freemium').length
    const paidTools = allTools.filter((t) => t.pricing === 'paid').length
    const avgRating = allTools.length > 0
      ? allTools.reduce((sum, t) => sum + (t.rating || 0), 0) / allTools.filter((t) => t.rating > 0).length
      : 0
    const totalReviews = allTools.reduce((sum, t) => sum + (t.reviewCount || 0), 0)

    return {
      totalTools: uniqueTools.size,
      totalStages: plan.stages.length,
      freeTools,
      freemiumTools,
      paidTools,
      avgRating: isNaN(avgRating) ? 0 : avgRating,
      totalReviews,
      pricingBreakdown: [
        { label: 'Free', count: freeTools, color: 'bg-emerald-500' },
        { label: 'Freemium', count: freemiumTools, color: 'bg-blue-500' },
        { label: 'Paid', count: paidTools, color: 'bg-amber-500' },
      ].filter((p) => p.count > 0),
    }
  }, [plan])

  async function handleSubmit(q?: string) {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery || loading) return

    setQuery(searchQuery)
    setLoading(true)
    setError('')
    setPlan(null)
    setActiveStage(null)
    setLoadingStep(0)

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
      if (data.stages?.length > 0) {
        setActiveStage(data.stages[0].id)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      clearInterval(loadingInterval.current)
    }
  }

  function handleReset() {
    setPlan(null)
    setQuery('')
    setError('')
    setActiveStage(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const currentStage = plan?.stages.find((s) => s.id === activeStage)

  return (
    <div className="w-full">
      {/* ─── Input State ─── */}
      {!plan && !loading && (
        <div className="space-y-10">
          {/* Search input */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 via-teal-600/15 to-cyan-600/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/90 backdrop-blur-sm p-2 focus-within:border-emerald-700/50 transition-all duration-300">
              <Sparkles className="ml-3 h-5 w-5 text-zinc-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="I want to build a CRM / automate my Instagram / launch a YouTube channel..."
                className="flex-1 bg-transparent px-2 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none"
                autoFocus={!initialQuery}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!query.trim()}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/30"
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

          {/* Example queries — card grid */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Popular plans
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {EXAMPLE_QUERIES.map((eq) => {
                const Icon = eq.icon
                return (
                  <button
                    key={eq.query}
                    onClick={() => handleSubmit(eq.query)}
                    className="group/card flex flex-col items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-left hover:border-emerald-800/50 hover:bg-emerald-950/10 transition-all duration-200"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50 group-hover/card:border-emerald-800/50 group-hover/card:bg-emerald-950/30 transition-colors">
                      <Icon className="h-4 w-4 text-zinc-500 group-hover/card:text-emerald-400 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400 group-hover/card:text-white transition-colors">
                      {eq.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="py-16">
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Animated spinner */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-900/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-teal-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-4 rounded-full border border-transparent border-t-cyan-400/50 animate-spin" style={{ animationDuration: '2.5s' }} />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-emerald-400" />
            </div>

            {/* Progress steps */}
            <div className="space-y-3 text-center">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`flex items-center justify-center gap-2.5 text-sm transition-all duration-500 ${
                    i < loadingStep
                      ? 'text-emerald-600'
                      : i === loadingStep
                        ? 'text-white font-medium'
                        : 'text-zinc-700'
                  }`}
                >
                  {i < loadingStep ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : i === loadingStep ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-zinc-800" />
                  )}
                  {step}
                </div>
              ))}
            </div>

            <p className="text-sm text-zinc-500">
              Analyzing <span className="text-zinc-300 font-medium">&ldquo;{query}&rdquo;</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Plan Result — Dashboard Layout ─── */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* ── Top Bar: Title + Actions ── */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-900/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 p-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Your AI Stack Plan
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                  {plan.title}
                </h2>
                <p className="mt-3 text-base text-zinc-400 leading-relaxed max-w-2xl">
                  {plan.summary}
                </p>
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
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Stats Cards Row ── */}
          {planStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-zinc-500 font-medium">Stages</span>
                </div>
                <p className="text-2xl font-bold text-white">{planStats.totalStages}</p>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-teal-400" />
                  <span className="text-xs text-zinc-500 font-medium">Tools matched</span>
                </div>
                <p className="text-2xl font-bold text-white">{planStats.totalTools}</p>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-zinc-500 font-medium">Avg. rating</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {planStats.avgRating > 0 ? planStats.avgRating.toFixed(1) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-zinc-500 font-medium">Pricing mix</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {planStats.pricingBreakdown.map((p) => (
                    <span
                      key={p.label}
                      className="text-[11px] text-zinc-400 flex items-center gap-1"
                    >
                      <span className={`h-2 w-2 rounded-full ${p.color}`} />
                      {p.count} {p.label}
                    </span>
                  ))}
                  {planStats.pricingBreakdown.length === 0 && (
                    <span className="text-2xl font-bold text-white">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Pricing Chart Bar ── */}
          {planStats && planStats.pricingBreakdown.length > 0 && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Cost breakdown
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {planStats.pricingBreakdown.map((p) => (
                    <span key={p.label} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className={`h-2 w-2 rounded-full ${p.color}`} />
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden bg-zinc-800/80">
                {planStats.pricingBreakdown.map((p) => (
                  <div
                    key={p.label}
                    className={`${p.color} transition-all duration-700`}
                    style={{
                      width: `${(p.count / (planStats.totalTools || 1)) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
                <span>{planStats.freeTools > 0 ? `${planStats.freeTools} free tool${planStats.freeTools > 1 ? 's' : ''}` : ''}</span>
                <span>{planStats.totalTools} total tools recommended</span>
              </div>
            </div>
          )}

          {/* ── Stage Timeline + Content Area ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Stage navigation timeline */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="p-4 border-b border-zinc-800/60">
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Project stages
                  </h3>
                </div>
                <div className="p-2">
                  {plan.stages.map((stage, i) => (
                    <button
                      key={stage.id}
                      onClick={() => setActiveStage(stage.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                        activeStage === stage.id
                          ? 'bg-emerald-950/30 border border-emerald-800/40'
                          : 'border border-transparent hover:bg-zinc-800/30'
                      }`}
                    >
                      {/* Timeline dot and line */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                            activeStage === stage.id
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                          }`}
                        >
                          {i + 1}
                        </div>
                        {i < plan.stages.length - 1 && (
                          <div className="w-px h-6 bg-zinc-800 mt-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            activeStage === stage.id ? 'text-white' : 'text-zinc-400'
                          }`}
                        >
                          {stage.name}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                          {stage.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-zinc-600 bg-zinc-800/80 rounded-full px-2 py-0.5">
                            {stage.tools.length} tool{stage.tools.length !== 1 ? 's' : ''}
                          </span>
                          {stage.tools[0] && (
                            <span className="text-[10px] text-emerald-600 truncate">
                              {stage.tools[0].name}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 mt-1 shrink-0 transition-colors ${
                          activeStage === stage.id ? 'text-emerald-400' : 'text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Active stage detail */}
            <div className="lg:col-span-8">
              {currentStage ? (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                  {/* Stage header */}
                  <div className="p-6 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900/80 to-zinc-900/40">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-900/30">
                        {plan.stages.findIndex((s) => s.id === activeStage) + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{currentStage.name}</h3>
                        <p className="mt-2 text-base text-zinc-300 leading-relaxed">
                          {currentStage.description}
                        </p>
                        {currentStage.why && (
                          <div className="mt-3 flex items-start gap-2 rounded-lg bg-zinc-800/30 border border-zinc-800/50 px-4 py-3">
                            <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-zinc-400 leading-relaxed">
                              {currentStage.why}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="p-6">
                    {currentStage.tools.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
                        <Package className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 font-medium">
                          No matching tools found for this stage
                        </p>
                        <Link
                          href="/tools"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          Browse all tools
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Recommended tools
                          </h4>
                          <span className="text-xs text-zinc-600">
                            {currentStage.tools.length} matched
                          </span>
                        </div>

                        {currentStage.tools.map((tool, ti) => (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className={`group/card relative flex items-start gap-4 rounded-xl border p-5 transition-all hover:shadow-lg ${
                              ti === 0
                                ? 'border-emerald-800/40 bg-gradient-to-r from-emerald-950/20 to-zinc-900/20 hover:border-emerald-700/50'
                                : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-700'
                            }`}
                          >
                            {/* Tool avatar */}
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-bold ${
                                ti === 0
                                  ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
                                  : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300'
                              }`}
                            >
                              {tool.name.charAt(0)}
                            </div>

                            {/* Tool info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-base font-semibold text-white group-hover/card:text-emerald-400 transition-colors">
                                  {tool.name}
                                </p>
                                {ti === 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <Trophy className="h-2.5 w-2.5" />
                                    Best pick
                                  </span>
                                )}
                                <span
                                  className={`text-[11px] font-medium rounded-full px-2.5 py-0.5 ${pricingColor(tool.pricing)}`}
                                >
                                  {pricingLabel(tool.pricing)}
                                </span>
                              </div>

                              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                {tool.tagline}
                              </p>

                              {tool.whyThisStage && (
                                <p className="mt-2 text-sm text-zinc-300 leading-relaxed bg-zinc-800/20 rounded-lg px-3 py-2 border-l-2 border-emerald-700/50">
                                  {tool.whyThisStage}
                                </p>
                              )}

                              <div className="mt-3 flex items-center gap-4">
                                {tool.rating > 0 && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    <span className="font-medium text-zinc-300">
                                      {tool.rating.toFixed(1)}
                                    </span>
                                    {tool.reviewCount > 0 && (
                                      <span className="text-zinc-600 text-xs">
                                        ({tool.reviewCount} review{tool.reviewCount !== 1 ? 's' : ''})
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className="text-xs text-emerald-500 group-hover/card:text-emerald-400 flex items-center gap-1 transition-colors">
                                  View details <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 flex items-center justify-center p-12">
                  <p className="text-sm text-zinc-600">Select a stage to view details</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Stage Overview / Flow ── */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Full project flow
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {plan.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveStage(stage.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      activeStage === stage.id
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-700/50'
                        : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <span className="font-bold">{i + 1}</span>
                    <span>{stage.name}</span>
                    {stage.tools[0] && (
                      <span className="text-[10px] text-zinc-600 bg-zinc-900/80 rounded-full px-1.5 py-0.5">
                        {stage.tools[0].name}
                      </span>
                    )}
                  </button>
                  {i < plan.stages.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Related Plans ── */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Try another plan
            </h4>
            <div className="flex flex-wrap gap-2">
              {RELATED_PLANS.map((rp) => (
                <button
                  key={rp.query}
                  onClick={() => handleSubmit(rp.query)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400 hover:border-emerald-800/50 hover:text-emerald-400 hover:bg-emerald-950/10 transition-all"
                >
                  {rp.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/60 bg-gradient-to-r from-zinc-900/50 to-zinc-900/30 p-5">
            <div>
              <p className="text-sm font-medium text-zinc-300">
                Want deeper insights?
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Compare tools side-by-side or get personalized AI recommendations.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/compare"
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Compare tools
              </Link>
              <Link
                href="/recommend"
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-900/20"
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
