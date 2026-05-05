import { ThumbsUp, ThumbsDown, TrendingUp, BookOpen, AlertTriangle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Phase 3 (2026-05-05): replaces the previous SentimentBlock + its client
// "Generate" / poll flow + the "See the full report" link. This component
// is pure server: it reads the cached synthesis from tool_sentiment_cache
// and renders inline. If the cache is missing or stale, it returns null
// + logs a server-side warning. Phase 4's backfill is what populates the
// cache for every published tool.

type SentimentRow = {
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
  status: string
  expires_at: string
}

export async function SentimentSynthesis({
  toolId,
  toolName,
}: {
  toolId: string
  toolName: string
}) {
  const supabase = await createClient()

  const { data: cached } = (await supabase
    .from('tool_sentiment_cache')
    .select(
      'ai_verdict, pros, cons, sentiment_score, sentiment_breakdown, themes, learning_curve, pricing_analysis, mention_count, sources_scraped, status, expires_at'
    )
    .eq('tool_id', toolId)
    .maybeSingle()) as { data: SentimentRow | null }

  const isFresh = cached && cached.status === 'ready' && new Date(cached.expires_at) > new Date()
  if (!isFresh) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[SentimentSynthesis] no fresh cache for tool ${toolId} (${toolName}) — Phase 4 backfill will populate this section.`
      )
    }
    return null
  }

  const breakdown = cached.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 }
  const total = breakdown.positive + breakdown.neutral + breakdown.negative || 1
  const pros = (cached.pros ?? []).slice(0, 5)
  const cons = (cached.cons ?? []).slice(0, 5)
  const themes = (cached.themes ?? []).slice(0, 3)
  const hiddenCosts = cached.pricing_analysis?.hidden_costs ?? []
  const learning = cached.learning_curve
  const sources = cached.sources_scraped ?? []

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search className="h-5 w-5 text-cyan-400" />
          What independent users actually report about {toolName}
        </h2>
        <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
          We ran a structured research pass across product reviews, community discussions, and post-purchase forum
          threads to surface the patterns vendors won&apos;t publish themselves. Below: the recurring strengths, the
          hidden costs people mention most, and the cohort that consistently regrets adopting this tool.
        </p>
        {cached.mention_count != null && cached.mention_count > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            {cached.mention_count} mentions across {sources.length} source{sources.length === 1 ? '' : 's'}
            {sources.length > 0 && ` (${sources.join(', ')})`}.
          </p>
        )}
      </div>

      {/* Sentiment breakdown bar */}
      {breakdown.positive + breakdown.neutral + breakdown.negative > 0 && (
        <div className="mb-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="bg-emerald-500" style={{ width: `${(breakdown.positive / total) * 100}%` }} />
            <div className="bg-zinc-600" style={{ width: `${(breakdown.neutral / total) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(breakdown.negative / total) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span className="text-emerald-400">{Math.round((breakdown.positive / total) * 100)}% positive</span>
            <span>{Math.round((breakdown.neutral / total) * 100)}% neutral</span>
            <span className="text-red-400">{Math.round((breakdown.negative / total) * 100)}% negative</span>
          </div>
        </div>
      )}

      {/* Pros / Cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {pros.length > 0 && (
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <ThumbsUp className="h-3.5 w-3.5" /> Recurring strengths
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
                <ThumbsDown className="h-3.5 w-3.5" /> Recurring frustrations
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
            <TrendingUp className="h-3.5 w-3.5" /> Patterns worth knowing
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

      {/* Hidden costs (synthesized from external sources, not the structured tools.hidden_costs column) */}
      {hiddenCosts.length > 0 && (
        <div className="rounded-lg border border-yellow-900/40 bg-yellow-950/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Hidden costs people mention
          </div>
          <ul className="space-y-1">
            {hiddenCosts.map((c, i) => (
              <li key={i} className="text-xs text-zinc-400">• {c}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
