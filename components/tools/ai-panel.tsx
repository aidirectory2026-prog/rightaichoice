'use client'

import { useState } from 'react'
import { Sparkles, CheckCircle2, XCircle, Users, Loader2, ChevronDown } from 'lucide-react'

type AiAnalysis = {
  verdict: string
  when_to_use: string[]
  when_to_avoid: string[]
  best_for: string[]
  sentiment: 'positive' | 'mixed' | 'negative'
}

type ToolData = {
  name: string
  slug: string
  tagline: string
  description: string
  pricing_type: string
  skill_level: string
  features: string[]
  has_api: boolean
  platforms: string[]
}

type ReviewData = {
  pros: string
  cons: string
  rating: number
  use_case: string
}

type Props = {
  tool: ToolData
  reviews: ReviewData[]
}

export function AiPanel({ tool, reviews }: Props) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleAnalyze() {
    if (analysis) {
      setOpen((v) => !v)
      return
    }
    setLoading(true)
    setError(null)
    setOpen(true)
    try {
      const res = await fetch(`/api/tools/${tool.slug}/ai-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, reviews }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed')
      setAnalysis(data as AiAnalysis)
    } catch {
      setError('Analysis unavailable right now. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const sentimentColor = {
    positive: 'text-emerald-400',
    mixed: 'text-amber-400',
    negative: 'text-red-400',
  }

  return (
    <section>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {/* Header — always visible, clickable to toggle */}
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white">AI Analysis — Should you use {tool.name}?</span>
          </div>
          <div className="flex items-center gap-2">
            {!analysis && !loading && (
              <span className="text-xs text-emerald-400 font-medium">Generate</span>
            )}
            {loading && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
            {analysis && (
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </button>

        {/* Body */}
        {open && (
          <div className="border-t border-zinc-800 px-5 py-4">
            {loading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-zinc-800" />
                <div className="h-4 w-full rounded bg-zinc-800" />
                <div className="h-4 w-2/3 rounded bg-zinc-800" />
              </div>
            )}

            {error && (
              <p className="text-sm text-zinc-500">{error}</p>
            )}

            {analysis && (
              <div className="space-y-5">
                {/* Verdict */}
                <p className={`text-sm font-medium ${sentimentColor[analysis.sentiment] ?? 'text-zinc-300'}`}>
                  {analysis.verdict}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* When to use */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">When to use</span>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.when_to_use.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* When to avoid */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">When to avoid</span>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.when_to_avoid.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Best for */}
                {analysis.best_for.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Best for</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.best_for.map((seg, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-blue-800/50 bg-blue-900/20 px-2.5 py-1 text-xs text-blue-300"
                        >
                          {seg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-600">Generated by Claude · Not a substitute for your own evaluation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
