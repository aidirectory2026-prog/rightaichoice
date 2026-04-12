'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  MessageSquare,
  Users,
  DollarSign,
  ArrowLeftRight,
  TrendingUp,
  GraduationCap,
  Puzzle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'

type Report = {
  ai_verdict: string
  pros: string[]
  cons: string[]
  sentiment_score: string
  sentiment_breakdown: Record<string, number>
  themes: Array<{ theme: string; sources: string[] }>
  best_for: string[]
  not_for: string[]
  pricing_analysis: {
    tiers: Array<{ name: string; price: string; features: string[] }>
    hidden_costs: string[]
    verdict: string
  }
  community_buzz: {
    volume: string
    trend: string
    topics: string[]
  }
  learning_curve: {
    time_to_start: string
    skill_level: string
    hurdles: string[]
  }
  integration_insights: Array<{
    tool: string
    sentiment: string
    note: string
  }>
  mention_count: number
  sources_scraped: string[]
  synthesized_at: string
}

type Status = 'loading' | 'generating' | 'ready' | 'failed' | 'not_generated'

const GENERATION_STEPS = [
  'Checking for cached report...',
  'Scraping Reddit, X, Quora & G2...',
  'Analyzing community sentiment...',
  'Synthesizing insights with AI...',
  'Preparing your report...',
]

export function ReportClient({
  slug,
  toolName,
  toolTagline,
}: {
  slug: string
  toolName: string
  toolTagline: string
}) {
  const [status, setStatus] = useState<Status>('loading')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [genStep, setGenStep] = useState(0)

  const fetchReport = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const res = await fetch(`/api/tools/${slug}/report`)
      const data = await res.json()

      if (data.status === 'ready' && data.report) {
        setReport(data.report)
        setStatus('ready')
      } else if (data.status === 'generating') {
        setStatus('generating')
        startPolling()
      } else {
        // not_generated — trigger generation
        setStatus('generating')
        triggerGeneration()
      }
    } catch {
      setError('Failed to load report')
      setStatus('failed')
    }
  }, [slug])

  async function triggerGeneration() {
    setGenStep(0)
    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1))
    }, 3000)

    try {
      const res = await fetch(`/api/tools/${slug}/report/generate`, { method: 'POST' })
      const data = await res.json()

      clearInterval(stepInterval)

      if (data.status === 'ready' && data.report) {
        setReport({
          ...data.report,
          mention_count: data.mention_count,
          sources_scraped: data.sources_scraped,
          synthesized_at: new Date().toISOString(),
        })
        setStatus('ready')
      } else if (data.status === 'generating') {
        startPolling()
      } else {
        setError(data.error || 'Report generation failed')
        setStatus('failed')
      }
    } catch {
      clearInterval(stepInterval)
      setError('Network error during generation')
      setStatus('failed')
    }
  }

  function startPolling() {
    setGenStep(1)
    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1))
    }, 4000)

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tools/${slug}/report/status`)
        const data = await res.json()
        if (data.status === 'ready') {
          clearInterval(pollInterval)
          clearInterval(stepInterval)
          fetchReport()
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          clearInterval(stepInterval)
          setError('Report generation failed')
          setStatus('failed')
        }
      } catch {
        // Keep polling
      }
    }, 3000)

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      clearInterval(stepInterval)
    }, 120_000)
  }

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // ── Loading / Generating State ──
  if (status === 'loading' || status === 'generating') {
    return (
      <div className="py-20">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-900/30" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-teal-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-emerald-400" />
          </div>

          {status === 'generating' && (
            <div className="space-y-3 text-center">
              {GENERATION_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`flex items-center justify-center gap-2.5 text-sm transition-all duration-500 ${
                    i < genStep ? 'text-emerald-600' : i === genStep ? 'text-white font-medium' : 'text-zinc-700'
                  }`}
                >
                  {i < genStep ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : i === genStep ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-800" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-zinc-500">
            Generating deep-dive report for <span className="text-zinc-300 font-medium">{toolName}</span>
          </p>
        </div>
      </div>
    )
  }

  // ── Failed State ──
  if (status === 'failed') {
    return (
      <div className="py-20 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Report Generation Failed</h2>
        <p className="text-sm text-zinc-400 mb-6">{error}</p>
        <button
          onClick={() => { setStatus('generating'); triggerGeneration() }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (!report) return null

  // ── Report Rendered ──
  const sentimentColor = report.sentiment_score === 'positive' ? 'text-emerald-400' : report.sentiment_score === 'negative' ? 'text-red-400' : 'text-amber-400'
  const sentimentBg = report.sentiment_score === 'positive' ? 'bg-emerald-950/30 border-emerald-800/40' : report.sentiment_score === 'negative' ? 'bg-red-950/30 border-red-800/40' : 'bg-amber-950/30 border-amber-800/40'

  return (
    <div className="space-y-8">
      {/* ── Back + Header ── */}
      <div>
        <Link
          href={`/tools/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {toolName}
        </Link>

        <div className={`rounded-2xl border p-6 ${sentimentBg}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Deep-Dive Report</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{toolName}</h1>
              <p className="mt-1 text-sm text-zinc-400">{toolTagline}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${sentimentBg} ${sentimentColor}`}>
                {report.sentiment_score}
              </div>
              <button
                onClick={() => { setStatus('generating'); triggerGeneration() }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                title="Refresh report"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span>Based on {report.mention_count} mentions</span>
            <span>Sources: {(report.sources_scraped ?? []).join(', ') || 'AI analysis'}</span>
            {report.synthesized_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(report.synthesized_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 1. AI Verdict ── */}
      <Section icon={Sparkles} title="AI Verdict" color="emerald">
        <p className="text-base text-zinc-300 leading-relaxed">{report.ai_verdict}</p>
      </Section>

      {/* ── 2. Pros & Cons ── */}
      <Section icon={ThumbsUp} title="5 Pros & 5 Cons" color="emerald">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pros</h4>
            {report.pros.map((pro, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-300">{pro}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cons</h4>
            {report.cons.map((con, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-300">{con}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 3. Market Sentiment ── */}
      <Section icon={BarChart3} title="Market Sentiment" color="teal">
        <div className="space-y-3">
          {Object.entries(report.sentiment_breakdown).map(([source, score]) => (
            <div key={source} className="flex items-center gap-3">
              <span className="w-16 text-xs text-zinc-400 capitalize">{source}</span>
              <div className="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    score > 0.6 ? 'bg-emerald-500' : score > 0.4 ? 'bg-amber-500' : score > 0 ? 'bg-red-500' : 'bg-zinc-700'
                  }`}
                  style={{ width: `${Math.max(score * 100, 2)}%` }}
                />
              </div>
              <span className="w-10 text-xs text-zinc-500 text-right">
                {score > 0 ? `${Math.round(score * 100)}%` : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. What People Are Saying ── */}
      <Section icon={MessageSquare} title="What People Are Saying" color="cyan">
        <div className="space-y-3">
          {report.themes.map((theme, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-sm text-zinc-300 font-medium">{theme.theme}</p>
              <div className="mt-2 flex gap-1.5">
                {theme.sources.map((s) => (
                  <span key={s} className="text-[10px] rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-500 capitalize">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5. Best For / Not For ── */}
      <Section icon={Users} title="Best For / Not For" color="emerald">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Best For</h4>
            <div className="flex flex-wrap gap-2">
              {report.best_for.map((item, i) => (
                <span key={i} className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-300">{item}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Not For</h4>
            <div className="flex flex-wrap gap-2">
              {report.not_for.map((item, i) => (
                <span key={i} className="rounded-lg border border-red-800/40 bg-red-950/20 px-3 py-1.5 text-xs text-red-300">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── 6. Pricing Breakdown ── */}
      <Section icon={DollarSign} title="Pricing Breakdown" color="amber">
        {report.pricing_analysis.tiers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-xs text-zinc-500 font-medium">Plan</th>
                  <th className="text-left py-2 pr-4 text-xs text-zinc-500 font-medium">Price</th>
                  <th className="text-left py-2 text-xs text-zinc-500 font-medium">Key Features</th>
                </tr>
              </thead>
              <tbody>
                {report.pricing_analysis.tiers.map((tier, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-zinc-300 font-medium">{tier.name}</td>
                    <td className="py-3 pr-4 text-zinc-400">{tier.price}</td>
                    <td className="py-3 text-zinc-500">{tier.features.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.pricing_analysis.hidden_costs.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-800/30 bg-amber-950/10 p-3">
            <h5 className="text-xs font-semibold text-amber-400 mb-2">Hidden Costs</h5>
            <ul className="space-y-1">
              {report.pricing_analysis.hidden_costs.map((cost, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">!</span> {cost}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.pricing_analysis.verdict && (
          <p className="mt-4 text-sm text-zinc-300 italic">{report.pricing_analysis.verdict}</p>
        )}
      </Section>

      {/* ── 7. Alternatives ── */}
      <Section icon={ArrowLeftRight} title="Alternatives" color="teal">
        <p className="text-sm text-zinc-400">
          View alternatives and compare side-by-side on the{' '}
          <Link href={`/tools/${slug}`} className="text-emerald-400 hover:text-emerald-300 transition-colors">
            tool page
          </Link>
          .
        </p>
      </Section>

      {/* ── 8. Community Buzz ── */}
      <Section icon={TrendingUp} title="Community Buzz" color="cyan">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Volume:</span>
            <span className={`text-xs font-medium capitalize ${
              report.community_buzz.volume === 'high' ? 'text-emerald-400' : report.community_buzz.volume === 'medium' ? 'text-amber-400' : 'text-zinc-400'
            }`}>{report.community_buzz.volume}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Trend:</span>
            <span className={`text-xs font-medium capitalize ${
              report.community_buzz.trend === 'up' ? 'text-emerald-400' : report.community_buzz.trend === 'down' ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {report.community_buzz.trend === 'up' ? 'Trending Up' : report.community_buzz.trend === 'down' ? 'Trending Down' : 'Stable'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.community_buzz.topics.map((topic, i) => (
            <span key={i} className="rounded-full bg-zinc-800/80 border border-zinc-700/50 px-3 py-1 text-xs text-zinc-300">{topic}</span>
          ))}
        </div>
      </Section>

      {/* ── 9. Learning Curve ── */}
      <Section icon={GraduationCap} title="Learning Curve" color="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <span className="text-xs text-zinc-500">Time to get started</span>
            <p className="text-lg font-semibold text-white mt-1">{report.learning_curve.time_to_start}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <span className="text-xs text-zinc-500">Skill level needed</span>
            <p className="text-lg font-semibold text-white mt-1 capitalize">{report.learning_curve.skill_level}</p>
          </div>
        </div>
        {report.learning_curve.hurdles.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Common Hurdles</h5>
            <ul className="space-y-2">
              {report.learning_curve.hurdles.map((h, i) => (
                <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">-</span> {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── 10. Integration Fit ── */}
      <Section icon={Puzzle} title="Integration Fit" color="teal">
        {report.integration_insights.length > 0 ? (
          <div className="space-y-3">
            {report.integration_insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  insight.sentiment === 'positive' ? 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-400' :
                  insight.sentiment === 'negative' ? 'bg-red-950/50 border border-red-800/50 text-red-400' :
                  'bg-zinc-800 border border-zinc-700 text-zinc-400'
                }`}>
                  {insight.tool.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{insight.tool}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{insight.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No integration insights available yet.</p>
        )}
      </Section>

      {/* ── Footer CTA ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
        <div>
          <p className="text-sm font-medium text-zinc-300">Want to compare alternatives?</p>
          <p className="text-xs text-zinc-500 mt-0.5">See how {toolName} stacks up side-by-side.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/tools/${slug}`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            View tool page
          </Link>
          <Link
            href="/plan"
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-900/20"
          >
            Plan a stack
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Reusable Section Wrapper ──
function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: 'emerald' | 'teal' | 'cyan' | 'amber'
  children: React.ReactNode
}) {
  const iconColors = {
    emerald: 'text-emerald-400',
    teal: 'text-teal-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-zinc-800/60">
        <Icon className={`h-4.5 w-4.5 ${iconColors[color]}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
