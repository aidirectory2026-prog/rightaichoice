import { createClient } from '@/lib/supabase/server'

// StackBack Phase A — public cached sentiment reader.
// The dedicated /tools/[slug]/sentiment page shows the latest SHARED report
// (from tool_sentiment_cache) to everyone, no login — a fresh real-time scan
// is the gated/paid action. This reader normalizes BOTH the original backfill
// schema (035) and the newer deep-report schema into the single shape the
// client report renderer expects, so cached reports render cleanly regardless
// of when they were generated. Rich-only fields (scorecard, momentum, quotes,
// live mentions) aren't stored in the cache — they appear only on a fresh scan,
// which is exactly the upgrade incentive.

export type Mention = { source: string; title: string; snippet: string; date: string | null; url: string | null; score: number | null }

export type SentimentReport = {
  ai_verdict: string
  bottom_line?: string
  standout_quotes?: { text: string; source: string; sentiment?: 'positive' | 'critical' | 'mixed' }[]
  scorecard?: { overall: number; value: number; ease_of_use: number; support: number; reliability: number; performance: number }
  red_flags?: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[]
  momentum?: { direction: 'rising' | 'steady' | 'cooling'; summary: string; drivers: string[] }
  pros: string[]
  cons: string[]
  sentiment_score: 'positive' | 'mixed' | 'negative'
  sentiment_breakdown?: Record<string, number>
  themes?: { theme: string; sources: string[] }[]
  best_for?: string[]
  not_for?: string[]
  learning_curve?: { time_to_start?: string; skill_level?: string; hurdles?: string[] }
  community_buzz?: { volume?: string; trend?: string; topics?: string[] }
  pricing_analysis?: { hidden_costs?: string[]; verdict?: string }
  mentions?: Mention[]
}

export type CachedSentiment = {
  report: SentimentReport
  scraped_at: string | null
  mention_count: number
  sources: string[]
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const asScore = (v: unknown): SentimentReport['sentiment_score'] =>
  v === 'positive' || v === 'negative' ? v : 'mixed'

/** Old backfill stored {positive,neutral,negative} counts; the renderer averages
 *  Record<string,number> 0–1 values. Collapse the old shape to a single 0–1
 *  positivity ratio so the positivity bar is correct; pass new shapes through. */
function normalizeBreakdown(v: unknown): Record<string, number> | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, number>
  const hasLegacy = ['positive', 'neutral', 'negative'].some((k) => typeof o[k] === 'number')
  if (hasLegacy) {
    const pos = o.positive ?? 0, neu = o.neutral ?? 0, neg = o.negative ?? 0
    const total = pos + neu + neg
    return total > 0 ? { positive: pos / total } : undefined
  }
  const nums = Object.fromEntries(Object.entries(o).filter(([, n]) => typeof n === 'number'))
  // Backfilled rows often carry an all-zero breakdown (no per-source signal).
  // Treat that as "no data" so the renderer hides the bar instead of showing a
  // misleading 0% positivity.
  const sum = Object.values(nums).reduce((a, b) => a + (b as number), 0)
  return sum > 0 ? (nums as Record<string, number>) : undefined
}

/** Old themes: {title,description}; new themes: {theme,sources}. */
function normalizeThemes(v: unknown): SentimentReport['themes'] {
  const arr = asArray<Record<string, unknown>>(v)
  if (!arr.length) return undefined
  return arr
    .map((t) => ({
      theme: String(t.theme ?? t.title ?? '').trim(),
      sources: asArray<string>(t.sources),
    }))
    .filter((t) => t.theme)
}

/** Old learning_curve: {difficulty,time_to_productivity}; new: {skill_level,time_to_start,hurdles}. */
function normalizeLearning(v: unknown): SentimentReport['learning_curve'] {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const skill_level = (o.skill_level ?? o.difficulty) as string | undefined
  const time_to_start = (o.time_to_start ?? o.time_to_productivity) as string | undefined
  const hurdles = asArray<string>(o.hurdles)
  if (!skill_level && !time_to_start && !hurdles.length) return undefined
  return { skill_level, time_to_start, hurdles: hurdles.length ? hurdles : undefined }
}

/**
 * Latest shared sentiment report for a tool, normalized for public display.
 * Returns null when there's no ready cache row yet (→ "be the first to scan").
 * Note: we intentionally show the latest cached row even if past `expires_at`
 * — it's labelled with its date, and the fresh scan is the way to refresh it.
 */
export async function getCachedSentiment(toolId: string): Promise<CachedSentiment | null> {
  const supabase = await createClient()
  const { data } = (await supabase
    .from('tool_sentiment_cache')
    .select(
      'ai_verdict, pros, cons, sentiment_score, sentiment_breakdown, themes, best_for, not_for, pricing_analysis, community_buzz, learning_curve, mention_count, sources_scraped, status, scraped_at'
    )
    .eq('tool_id', toolId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .maybeSingle()) as { data: any }

  if (!data || data.status !== 'ready' || !data.ai_verdict) return null

  const pa = (data.pricing_analysis ?? {}) as Record<string, unknown>
  const cb = (data.community_buzz ?? {}) as Record<string, unknown>

  const report: SentimentReport = {
    ai_verdict: String(data.ai_verdict),
    pros: asArray<string>(data.pros),
    cons: asArray<string>(data.cons),
    sentiment_score: asScore(data.sentiment_score),
    sentiment_breakdown: normalizeBreakdown(data.sentiment_breakdown),
    themes: normalizeThemes(data.themes),
    best_for: asArray<string>(data.best_for),
    not_for: asArray<string>(data.not_for),
    learning_curve: normalizeLearning(data.learning_curve),
    community_buzz: {
      volume: cb.volume as string | undefined,
      trend: cb.trend as string | undefined,
      topics: asArray<string>(cb.topics),
    },
    pricing_analysis: {
      hidden_costs: asArray<string>(pa.hidden_costs),
      verdict: pa.verdict as string | undefined,
    },
  }

  return {
    report,
    scraped_at: data.scraped_at ?? null,
    mention_count: typeof data.mention_count === 'number' ? data.mention_count : 0,
    sources: asArray<string>(data.sources_scraped),
  }
}
