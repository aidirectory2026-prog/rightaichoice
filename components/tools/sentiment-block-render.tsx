import Link from 'next/link'
import { ThumbsUp, ThumbsDown, TrendingUp, BookOpen, AlertTriangle, Users, ArrowRight } from 'lucide-react'

export type SentimentRenderData = {
  ai_verdict: string | null
  pros: string[] | null
  cons: string[] | null
  sentiment_score: string | null
  sentiment_breakdown: { positive: number; neutral: number; negative: number } | null
  themes: { title: string; description: string; sentiment?: string }[] | null
  learning_curve: { difficulty: string; time_to_productivity: string; notes?: string } | null
  pricing_analysis: { hidden_costs?: string[]; value_rating?: string } | null
  mention_count: number | null
  sources_scraped: string[] | null
}

export function SentimentBlockRender({
  data,
  slug,
  toolName,
}: {
  data: SentimentRenderData
  slug: string
  toolName: string
}) {
  const breakdown = data.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 }
  const total = breakdown.positive + breakdown.neutral + breakdown.negative || 1
  const pros = (data.pros ?? []).slice(0, 5)
  const cons = (data.cons ?? []).slice(0, 5)
  const themes = (data.themes ?? []).slice(0, 3)
  const hiddenCosts = data.pricing_analysis?.hidden_costs ?? []
  const learning = data.learning_curve

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          Community & Market Signals
        </h2>
        {data.mention_count != null && data.mention_count > 0 && (
          <span className="text-xs text-zinc-500">
            {data.mention_count} mentions across {(data.sources_scraped ?? []).length} sources
          </span>
        )}
      </div>

      {/* Sentiment breakdown bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Market sentiment</span>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            {(data.sources_scraped ?? []).map((s) => (
              <span key={s} className="rounded-full border border-zinc-800 px-2 py-0.5 capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="bg-emerald-500" style={{ width: `${(breakdown.positive / total) * 100}%` }} title={`${breakdown.positive} positive`} />
          <div className="bg-zinc-600" style={{ width: `${(breakdown.neutral / total) * 100}%` }} title={`${breakdown.neutral} neutral`} />
          <div className="bg-red-500" style={{ width: `${(breakdown.negative / total) * 100}%` }} title={`${breakdown.negative} negative`} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
          <span className="text-emerald-400">{Math.round((breakdown.positive / total) * 100)}% positive</span>
          <span>{Math.round((breakdown.neutral / total) * 100)}% neutral</span>
          <span className="text-red-400">{Math.round((breakdown.negative / total) * 100)}% negative</span>
        </div>
      </div>

      {/* Pros / Cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {pros.length > 0 && (
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <ThumbsUp className="h-3.5 w-3.5" /> What people love
              </div>
              <ul className="space-y-1.5">
                {pros.map((p, i) => (
                  <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-1.5">
                    <span className="text-emerald-500 mt-0.5">+</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-2">
                <ThumbsDown className="h-3.5 w-3.5" /> Common complaints
              </div>
              <ul className="space-y-1.5">
                {cons.map((c, i) => (
                  <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-1.5">
                    <span className="text-red-500 mt-0.5">−</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Recurring themes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {themes.map((t, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs font-medium text-white mb-1">{t.title}</div>
                <div className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{t.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning curve */}
      {learning && (
        <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-1.5">
            <BookOpen className="h-3.5 w-3.5 text-blue-400" /> Learning curve
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full border border-blue-900/40 bg-blue-950/30 px-2.5 py-0.5 text-blue-300 capitalize">
              {learning.difficulty}
            </span>
            <span className="text-zinc-400">Productive in ~{learning.time_to_productivity}</span>
          </div>
        </div>
      )}

      {/* Hidden costs warning */}
      {hiddenCosts.length > 0 && (
        <div className="mb-5 rounded-lg border border-yellow-900/40 bg-yellow-950/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Heads up — hidden costs
          </div>
          <ul className="space-y-1">
            {hiddenCosts.map((c, i) => (
              <li key={i} className="text-xs text-zinc-400">• {c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA to full report */}
      <Link
        href={`/tools/${slug}/report`}
        className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        See the full {toolName} report
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}
