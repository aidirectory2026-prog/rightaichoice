import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  Search,
  Bookmark,
  Mail,
  GitBranch,
  Cloud,
  Activity,
  Layers,
} from 'lucide-react'
import { PipelineRunRow } from '@/components/admin/pipeline-run-drilldown'
import { RangePicker } from '@/components/admin/range-picker'
import { parseRange, RANGE_LABELS, type RangeKey } from '@/lib/admin/range'

// /admin/updates — the "knowledge room"
// One page, one purpose: tell the operator what users and pipelines did
// over the selected period, with full drill-down on errors. Live-fetched
// on every request (force-dynamic) — no caching. Every section uses
// indexed Supabase queries; whole page typically renders in <1s.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Knowledge Room — Admin' }

function ago(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Pipeline run rows (pipeline_runs is the single source of truth) ──
// Phase 8.d.5 (2026-05-18): replaced the live GH API fetch with a
// Supabase query against pipeline_runs. The poll-gh-actions cron syncs
// GH every 10 min; Vercel crons self-log via withPipelineLogging. This
// means: page renders in <100ms even if GH API is slow, and we keep
// error history forever (GH only retains 90 days).
type PipelineRunRow = {
  id: string
  source: 'vercel_cron' | 'gh_actions'
  pipeline_key: string
  status: 'running' | 'success' | 'failure' | 'timeout' | 'partial'
  started_at: string
  duration_ms: number | null
  items_processed: number
  items_succeeded: number
  items_failed: number
  error_message: string | null
  error_class: string | null
  metadata: Record<string, unknown> | null
}

export default async function KnowledgeRoom({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const sel = parseRange(sp)
  const range: RangeKey = sel.key
  const cutoff = sel.cutoffISO
  const supabase = await createClient()

  // ── Parallel-fan-out all queries; every one is small + indexed ───
  const [
    catalogStats,
    pageViewsStats,
    topTools,
    searchStats,
    topSearches,
    saves,
    plansSaved,
    newsletterSignups,
    referringDomains,
    outreachStats,
    refreshLogsByStatus,
    refreshErrors,
    ingestionByStatus,
    ingestionErrors,
    cascadeRecent,
    dailyHistory,
    pipelineRuns,
    toolsRefreshed,
    toolsNewlyAdded,
    toolsLatestRefreshed,
    costRows,
    cost24hRows,
    healthRows,
  ] = await Promise.all([
    // Catalog
    (async () => {
      const [pub, stalest, backlog, neverRefreshed, withLatest] = await Promise.all([
        supabase.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('tools').select('last_verified_at').eq('is_published', true).not('last_verified_at', 'is', null).order('last_verified_at', { ascending: true }).limit(1).single(),
        supabase.from('v_stale_comparisons').select('comparison_id', { count: 'exact', head: true }),
        supabase.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).is('last_verified_at', null),
        supabase.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).not('latest_updates_at', 'is', null),
      ])
      return {
        published: pub.count ?? 0,
        stalest: (stalest.data as { last_verified_at: string } | null)?.last_verified_at ?? null,
        cascadeBacklog: backlog.count ?? 0,
        neverRefreshed: neverRefreshed.count ?? 0,
        withLatest: withLatest.count ?? 0,
      }
    })(),

    // Page views (count + unique tools)
    supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .then((r) => ({ total: r.count ?? 0 })),

    // Top viewed tools (period) — group by tool_id then resolve
    supabase
      .from('page_views')
      .select('tool_id')
      .gte('created_at', cutoff)
      .not('tool_id', 'is', null)
      .limit(2000)
      .then(async (r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as { tool_id: string }[]) {
          counts[row.tool_id] = (counts[row.tool_id] ?? 0) + 1
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
        const ids = top.map((t) => t[0])
        const tools = ids.length
          ? await supabase.from('tools').select('id, slug, name').in('id', ids).then((rr) => rr.data ?? [])
          : []
        const lookup = new Map((tools as { id: string; slug: string; name: string }[]).map((t) => [t.id, t]))
        return top.map(([id, count]) => ({ id, count, tool: lookup.get(id) ?? null }))
      }),

    // Search total
    supabase
      .from('search_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .then((r) => ({ total: r.count ?? 0 })),

    // Top search queries
    supabase
      .from('search_logs')
      .select('query, result_count')
      .gte('created_at', cutoff)
      .limit(2000)
      .then((r) => {
        const counts: Record<string, { count: number; zeroResult: number }> = {}
        for (const row of (r.data ?? []) as { query: string; result_count: number }[]) {
          const q = (row.query ?? '').trim().toLowerCase()
          if (!q) continue
          if (!counts[q]) counts[q] = { count: 0, zeroResult: 0 }
          counts[q].count++
          if (!row.result_count || row.result_count === 0) counts[q].zeroResult++
        }
        return Object.entries(counts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([q, v]) => ({ query: q, count: v.count, zeroResult: v.zeroResult }))
      }),

    // Saves
    supabase
      .from('user_saved_tools')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .then((r) => r.count ?? 0),

    // Plans (saved stacks)
    supabase
      .from('saved_stacks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .then((r) => r.count ?? 0),

    // Newsletter signups
    supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .then((r) => r.count ?? 0),

    // Referring domains
    supabase
      .from('referring_domains')
      .select('id', { count: 'exact', head: true })
      .gte('first_seen_at', cutoff)
      .then((r) => r.count ?? 0),

    // Outreach stats
    supabase
      .from('outreach_log')
      .select('id, sent_at, response')
      .gte('drafted_at', cutoff)
      .limit(1000)
      .then((r) => {
        const rows = (r.data ?? []) as Array<{ sent_at: string | null; response: string | null }>
        return {
          drafted: rows.length,
          sent: rows.filter((x) => x.sent_at).length,
          replies: rows.filter((x) => x.response).length,
        }
      }),

    // Refresh logs grouped by status
    supabase
      .from('refresh_logs')
      .select('status')
      .gte('created_at', cutoff)
      .limit(5000)
      .then((r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as { status: string }[]) {
          counts[row.status] = (counts[row.status] ?? 0) + 1
        }
        return counts
      }),

    // Refresh errors (last 8)
    supabase
      .from('refresh_logs')
      .select('tool_slug, error_message, created_at')
      .eq('status', 'failed')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(8)
      .then((r) => (r.data ?? []) as Array<{ tool_slug: string; error_message: string; created_at: string }>),

    // Ingestion stages
    supabase
      .from('ingestion_logs')
      .select('status')
      .gte('created_at', cutoff)
      .limit(5000)
      .then((r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as { status: string }[]) {
          counts[row.status] = (counts[row.status] ?? 0) + 1
        }
        return counts
      }),

    // Ingestion errors (last 8)
    supabase
      .from('ingestion_logs')
      .select('tool_name, status, error_message, created_at, source')
      .in('status', ['failed', 'gated'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(8)
      .then((r) => (r.data ?? []) as Array<{ tool_name: string; status: string; error_message: string; source: string; created_at: string }>),

    // Cascade-regenerated compares (recent)
    supabase
      .from('tool_comparisons')
      .select('slug, last_reviewed_at')
      .eq('is_editorial', true)
      .gte('last_reviewed_at', cutoff)
      .order('last_reviewed_at', { ascending: false })
      .limit(20)
      .then((r) => (r.data ?? []) as Array<{ slug: string; last_reviewed_at: string }>),

    // Daily history (60 days)
    supabase
      .from('daily_update_summaries')
      .select('*')
      .order('utc_date', { ascending: false })
      .limit(60)
      .then((r) => r.data ?? []),

    // Pipeline runs — every Vercel cron + GH Actions run in the window.
    // Filtered by started_at >= cutoff so date-range picker controls it.
    supabase
      .from('pipeline_runs')
      .select('id, source, pipeline_key, status, started_at, duration_ms, items_processed, items_succeeded, items_failed, error_message, error_class, metadata')
      .gte('started_at', cutoff)
      .order('started_at', { ascending: false })
      .limit(200)
      .then((r) => (r.data ?? []) as unknown as PipelineRunRow[]),

    // Activity feed: tools refreshed in window (top 20 by recency).
    // Joins refresh_logs → tools for the human-readable name.
    supabase
      .from('refresh_logs')
      .select('tool_slug, created_at')
      .eq('status', 'refreshed')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(async (r) => {
        const rows = (r.data ?? []) as Array<{ tool_slug: string; created_at: string }>
        if (rows.length === 0) return [] as Array<{ slug: string; name: string; created_at: string }>
        const slugs = Array.from(new Set(rows.map((x) => x.tool_slug)))
        const namesRes = await supabase.from('tools').select('slug, name').in('slug', slugs)
        const lookup = new Map(((namesRes.data ?? []) as Array<{ slug: string; name: string }>).map((t) => [t.slug, t.name]))
        return rows.map((x) => ({ slug: x.tool_slug, name: lookup.get(x.tool_slug) ?? x.tool_slug, created_at: x.created_at }))
      }),

    // Activity feed: newly added tools (published in window).
    supabase
      .from('tools')
      .select('slug, name, created_at, submitted_by')
      .eq('is_published', true)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((r) => (r.data ?? []) as Array<{ slug: string; name: string; created_at: string; submitted_by: string | null }>),

    // Activity feed: tools whose "Latest from" was refreshed in window.
    supabase
      .from('tools')
      .select('slug, name, latest_updates_at')
      .eq('is_published', true)
      .gte('latest_updates_at', cutoff)
      .order('latest_updates_at', { ascending: false })
      .limit(20)
      .then((r) => (r.data ?? []) as Array<{ slug: string; name: string; latest_updates_at: string }>),

    // Cost tracker: pipeline_runs in window with per-provider tokens + apify.
    // Aggregated client-side; expected volume <5000 rows even at 30d.
    supabase
      .from('pipeline_runs')
      .select('pipeline_key, estimated_cost_usd, deepseek_tokens_in, deepseek_tokens_out, anthropic_tokens_in, anthropic_tokens_out, apify_usd')
      .gte('started_at', cutoff)
      .limit(5000)
      .then((r) => (r.data ?? []) as Array<{ pipeline_key: string; estimated_cost_usd: number; deepseek_tokens_in: number; deepseek_tokens_out: number; anthropic_tokens_in: number; anthropic_tokens_out: number; apify_usd: number }>),

    // Per-pipeline trailing-24h cost for the "$5/day red flag" check.
    // Always 24h regardless of selected range (red-flag is about now, not history).
    supabase
      .from('pipeline_runs')
      .select('pipeline_key, estimated_cost_usd')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(5000)
      .then((r) => (r.data ?? []) as Array<{ pipeline_key: string; estimated_cost_usd: number }>),

    // Health score: pull last 60 days; aggregate 7d/30d windows + trend client-side.
    supabase
      .from('pipeline_runs')
      .select('pipeline_key, status, started_at, duration_ms, error_class')
      .gte('started_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10000)
      .then((r) => (r.data ?? []) as Array<{ pipeline_key: string; status: string; started_at: string; duration_ms: number | null; error_class: string | null }>),
  ])

  // ── Cost aggregation (client-side, ~O(n) over ≤5k rows) ──────────
  type CostAgg = {
    pipelineKey: string
    total: number
    deepseekUsd: number
    anthropicUsd: number
    apifyUsd: number
    runCount: number
  }
  const costByPipeline = new Map<string, CostAgg>()
  for (const row of costRows) {
    const k = row.pipeline_key
    if (!costByPipeline.has(k)) {
      costByPipeline.set(k, { pipelineKey: k, total: 0, deepseekUsd: 0, anthropicUsd: 0, apifyUsd: 0, runCount: 0 })
    }
    const agg = costByPipeline.get(k)!
    agg.total += Number(row.estimated_cost_usd) || 0
    agg.apifyUsd += Number(row.apify_usd) || 0
    // Token costs are already rolled into estimated_cost_usd by the wrapper;
    // we recompute the per-provider split for the breakdown bar.
    const dsCost = ((row.deepseek_tokens_in || 0) * 0.27 + (row.deepseek_tokens_out || 0) * 1.1) / 1_000_000
    const anCost = Number(row.estimated_cost_usd || 0) - dsCost - Number(row.apify_usd || 0)
    agg.deepseekUsd += dsCost
    agg.anthropicUsd += Math.max(0, anCost)
    agg.runCount++
  }
  const costAggList = Array.from(costByPipeline.values()).sort((a, b) => b.total - a.total)
  const costTotal = costAggList.reduce((sum, a) => sum + a.total, 0)

  const cost24hByPipeline = new Map<string, number>()
  for (const row of cost24hRows) {
    cost24hByPipeline.set(row.pipeline_key, (cost24hByPipeline.get(row.pipeline_key) ?? 0) + (Number(row.estimated_cost_usd) || 0))
  }
  const overBudget = Array.from(cost24hByPipeline.entries()).filter(([, v]) => v > 5)

  // ── Health-score aggregation ─────────────────────────────────────
  type HealthAgg = {
    pipelineKey: string
    successRate7d: number | null
    successRate30d: number | null
    successRate7dPrior: number | null  // days 8-14
    successRate30dPrior: number | null // days 31-60
    meanDuration7d: number | null
    p95Duration7d: number | null
    errorClasses30d: Record<string, number>
    runCount30d: number
  }
  const now = Date.now()
  const ms = (days: number) => days * 24 * 60 * 60 * 1000
  function inRange(t: string, fromMs: number, toMs: number): boolean {
    const v = new Date(t).getTime()
    return v >= fromMs && v < toMs
  }
  function rate(rows: typeof healthRows): number | null {
    if (rows.length === 0) return null
    const ok = rows.filter((r) => r.status === 'success').length
    return ok / rows.length
  }
  function percentile(values: number[], p: number): number | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const idx = Math.floor(sorted.length * p)
    return sorted[Math.min(idx, sorted.length - 1)] ?? null
  }
  const healthByPipeline = new Map<string, HealthAgg>()
  for (const r of healthRows) {
    if (!healthByPipeline.has(r.pipeline_key)) {
      healthByPipeline.set(r.pipeline_key, {
        pipelineKey: r.pipeline_key,
        successRate7d: null,
        successRate30d: null,
        successRate7dPrior: null,
        successRate30dPrior: null,
        meanDuration7d: null,
        p95Duration7d: null,
        errorClasses30d: {},
        runCount30d: 0,
      })
    }
  }
  for (const [pk, agg] of healthByPipeline) {
    const pkRows = healthRows.filter((r) => r.pipeline_key === pk)
    const last7 = pkRows.filter((r) => inRange(r.started_at, now - ms(7), now))
    const prior7 = pkRows.filter((r) => inRange(r.started_at, now - ms(14), now - ms(7)))
    const last30 = pkRows.filter((r) => inRange(r.started_at, now - ms(30), now))
    const prior30 = pkRows.filter((r) => inRange(r.started_at, now - ms(60), now - ms(30)))
    agg.successRate7d = rate(last7)
    agg.successRate7dPrior = rate(prior7)
    agg.successRate30d = rate(last30)
    agg.successRate30dPrior = rate(prior30)
    agg.runCount30d = last30.length
    const durs7 = last7.map((r) => r.duration_ms).filter((d): d is number => typeof d === 'number')
    agg.meanDuration7d = durs7.length ? durs7.reduce((a, b) => a + b, 0) / durs7.length : null
    agg.p95Duration7d = percentile(durs7, 0.95)
    for (const r of last30) {
      if (r.status !== 'success' && r.error_class) {
        agg.errorClasses30d[r.error_class] = (agg.errorClasses30d[r.error_class] ?? 0) + 1
      }
    }
  }
  const healthList = Array.from(healthByPipeline.values()).sort((a, b) => {
    // Surface degrading pipelines first.
    const aDeg = (a.successRate7d ?? 1) < 0.9 ? 0 : 1
    const bDeg = (b.successRate7d ?? 1) < 0.9 ? 0 : 1
    if (aDeg !== bDeg) return aDeg - bDeg
    return (a.successRate30d ?? 1) - (b.successRate30d ?? 1)
  })

  // ── Pipeline tallies ──────────────────────────────────────────────
  const refreshOk = refreshLogsByStatus['refreshed'] ?? 0
  const refreshFailed = refreshLogsByStatus['failed'] ?? 0
  const ingestOk = ingestionByStatus['discovered'] ?? 0
  const ingestGated = ingestionByStatus['gated'] ?? 0
  const ingestFailed = ingestionByStatus['failed'] ?? 0
  const ingestDup = ingestionByStatus['duplicate'] ?? 0

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Room</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time activity + pipeline results + errors. Live-fetched every request.
          </p>
          <p className="text-[11px] text-zinc-600 mt-1 font-mono">
            data fetched at <span className="text-zinc-500">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
          </p>
        </div>
        <RangePicker active={range} />
      </div>

      {/* ── 1. CATALOG STATE (always today) ─────────────────────── */}
      <Section
        title="Catalog state"
        icon={<Layers className="h-4 w-4 text-emerald-400" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <Stat label="Published tools" value={catalogStats.published.toLocaleString()} />
          <Stat label="Stalest tool" value={ago(catalogStats.stalest)} />
          <Stat label="Cascade backlog" value={catalogStats.cascadeBacklog.toLocaleString()} sub="compares needing review" />
          <Stat label="Never refreshed" value={catalogStats.neverRefreshed.toLocaleString()} />
          <Stat label="With latest_updates" value={catalogStats.withLatest.toLocaleString()} sub={`of ${catalogStats.published}`} />
        </div>
        <div className="mt-2 text-right">
          <Link href="/admin/freshness" className="text-[11px] text-emerald-400 hover:text-emerald-300">
            full freshness map →
          </Link>
        </div>
      </Section>

      {/* ── 2. USER ACTIVITY (period-scoped) ──────────────────── */}
      <Section
        title={`User activity · ${RANGE_LABELS[range]}`}
        icon={<Activity className="h-4 w-4 text-cyan-400" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <Stat icon={<Eye className="h-4 w-4" />} label="Page views" value={pageViewsStats.total.toLocaleString()} />
          <Stat icon={<Search className="h-4 w-4" />} label="Searches" value={searchStats.total.toLocaleString()} />
          <Stat icon={<Bookmark className="h-4 w-4" />} label="Tool saves" value={saves.toLocaleString()} />
          <Stat icon={<Layers className="h-4 w-4" />} label="Plans saved" value={plansSaved.toLocaleString()} />
          <Stat icon={<Mail className="h-4 w-4" />} label="Newsletter" value={newsletterSignups.toLocaleString()} />
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="New RDs" value={referringDomains.toLocaleString()} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top viewed tools */}
          <Panel title="Top viewed tools">
            {topTools.length === 0 ? (
              <Empty>No page views in this window</Empty>
            ) : (
              <ol className="space-y-1.5">
                {topTools.map((t, i) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-zinc-500 tabular-nums w-5">{i + 1}.</span>
                      {t.tool ? (
                        <Link href={`/tools/${t.tool.slug}`} target="_blank" className="text-zinc-200 hover:text-emerald-300 truncate">
                          {t.tool.name}
                        </Link>
                      ) : (
                        <span className="text-zinc-500 italic">unknown tool</span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums shrink-0">{t.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {/* Top searches */}
          <Panel title="Top search queries">
            {topSearches.length === 0 ? (
              <Empty>No searches yet</Empty>
            ) : (
              <ol className="space-y-1.5">
                {topSearches.map((s, i) => (
                  <li key={s.query} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-zinc-500 tabular-nums w-5">{i + 1}.</span>
                      <Link href={`/search?q=${encodeURIComponent(s.query)}`} target="_blank" className="text-zinc-200 hover:text-emerald-300 truncate">
                        {s.query}
                      </Link>
                      {s.zeroResult > 0 && (
                        <span className="text-[10px] text-amber-400" title={`${s.zeroResult} zero-result hits`}>
                          ⚠ {s.zeroResult}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums shrink-0">{s.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          <strong className="text-zinc-400">Outreach this period:</strong>{' '}
          {outreachStats.drafted} drafted · {outreachStats.sent} sent · {outreachStats.replies} replies
        </div>
      </Section>

      {/* ── 2.5 ACTIVITY FEED — tool names, not counts ─────────── */}
      <Section
        title={`Activity feed · ${RANGE_LABELS[range]}`}
        icon={<Activity className="h-4 w-4 text-fuchsia-400" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel
            title="Tools refreshed"
            right={<ActivityCount count={toolsRefreshed.length} more={toolsRefreshed.length >= 20} type="refreshed" />}
          >
            {toolsRefreshed.length === 0 ? (
              <Empty>No refreshes in window</Empty>
            ) : (
              <ol className="space-y-1">
                {toolsRefreshed.slice(0, 8).map((t) => (
                  <ActivityRow key={t.slug + t.created_at} slug={t.slug} name={t.name} when={t.created_at} />
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="Tools newly added"
            right={<ActivityCount count={toolsNewlyAdded.length} more={toolsNewlyAdded.length >= 20} type="added" />}
          >
            {toolsNewlyAdded.length === 0 ? (
              <Empty>No new tools in window</Empty>
            ) : (
              <ol className="space-y-1">
                {toolsNewlyAdded.slice(0, 8).map((t) => (
                  <ActivityRow
                    key={t.slug}
                    slug={t.slug}
                    name={t.name}
                    when={t.created_at}
                    sub={t.submitted_by ? 'manual' : 'auto-ingested'}
                  />
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="“Latest from” refreshed"
            right={<ActivityCount count={toolsLatestRefreshed.length} more={toolsLatestRefreshed.length >= 20} type="latest" />}
          >
            {toolsLatestRefreshed.length === 0 ? (
              <Empty>No latest-updates refreshes in window</Empty>
            ) : (
              <ol className="space-y-1">
                {toolsLatestRefreshed.slice(0, 8).map((t) => (
                  <ActivityRow key={t.slug} slug={t.slug} name={t.name} when={t.latest_updates_at} />
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </Section>

      {/* ── 3. PIPELINE RESULTS (period-scoped) ────────────────── */}
      <Section
        title={`Pipeline results · ${RANGE_LABELS[range]}`}
        icon={<RefreshCw className="h-4 w-4 text-amber-400" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel
            title="Tool refresh (DeepSeek SOP)"
            right={
              <span className="text-xs text-zinc-400">
                <span className="text-emerald-400">{refreshOk}</span> ok ·{' '}
                <span className="text-rose-400">{refreshFailed}</span> failed
              </span>
            }
          >
            {refreshErrors.length === 0 ? (
              <Empty>{refreshOk > 0 ? '✓ no failures in window' : 'No refresh runs in window'}</Empty>
            ) : (
              <ul className="space-y-2">
                {refreshErrors.map((e, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/tools/${e.tool_slug}`} target="_blank" className="text-rose-300 hover:text-rose-200 font-medium">
                        {e.tool_slug}
                      </Link>
                      <span className="text-zinc-600">{ago(e.created_at)}</span>
                    </div>
                    <p className="text-zinc-500 mt-0.5 line-clamp-2">{e.error_message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Ingestion (traction-gated)"
            right={
              <span className="text-xs text-zinc-400">
                {ingestOk} discovered · {ingestDup} dup · <span className="text-amber-400">{ingestGated}</span> gated ·{' '}
                <span className="text-rose-400">{ingestFailed}</span> failed
              </span>
            }
          >
            {ingestionErrors.length === 0 ? (
              <Empty>{ingestOk > 0 ? '✓ no failures in window' : 'No ingestion runs in window'}</Empty>
            ) : (
              <ul className="space-y-2">
                {ingestionErrors.map((e, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={e.status === 'failed' ? 'text-rose-300 font-medium' : 'text-amber-300 font-medium'}>
                        {e.tool_name}
                      </span>
                      <span className="text-zinc-600">
                        {e.status} · {ago(e.created_at)}
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-0.5 line-clamp-2">
                      {e.error_message ?? '(no message)'} <span className="text-zinc-700">· src: {e.source}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Cascade — compare editorials regenerated"
            right={<span className="text-xs text-zinc-400">{cascadeRecent.length} in window</span>}
          >
            {cascadeRecent.length === 0 ? (
              <Empty>No cascade activity in this window</Empty>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {cascadeRecent.slice(0, 14).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    target="_blank"
                    className="rounded border border-emerald-800/40 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-200 hover:border-emerald-600/60 hover:text-emerald-100"
                    title={`Reviewed ${ago(c.last_reviewed_at)}`}
                  >
                    {c.slug}
                  </Link>
                ))}
                {cascadeRecent.length > 14 && (
                  <span className="text-[11px] text-zinc-500 py-1">+{cascadeRecent.length - 14} more</span>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Pipeline health snapshot">
            <ul className="space-y-2 text-xs text-zinc-300">
              <HealthLine ok={refreshOk > 0 || range === 'today'} label="Tool refresh" detail={`${refreshOk}/${refreshOk + refreshFailed} ok`} />
              <HealthLine ok={ingestOk > 0 || range === 'today'} label="Ingestion" detail={`${ingestOk} discovered, ${ingestFailed} failed`} />
              <HealthLine ok={cascadeRecent.length > 0 || range === 'today'} label="Cascade" detail={`${cascadeRecent.length} compares regenerated`} />
              <HealthLine ok={catalogStats.neverRefreshed === 0} label="Never-refreshed catalog" detail={`${catalogStats.neverRefreshed} tools`} />
              <HealthLine ok={catalogStats.cascadeBacklog < 1000} label="Cascade backlog" detail={`${catalogStats.cascadeBacklog} compares stale`} />
            </ul>
          </Panel>
        </div>
      </Section>

      {/* ── 4. PIPELINE RUNS (period-scoped, click to drilldown) ─ */}
      <Section
        title={`Pipeline runs · ${RANGE_LABELS[range]}`}
        icon={<Activity className="h-4 w-4 text-violet-400" />}
      >
        {pipelineRuns.length === 0 ? (
          <Panel title="">
            <div className="text-sm text-zinc-400">
              No pipeline runs recorded in this window yet. New runs will appear here as Vercel
              crons and GitHub Actions fire (poll-gh-actions syncs every 10 min).
            </div>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RunsPanel
              title="Vercel crons"
              icon={<Cloud className="h-4 w-4 text-cyan-400" />}
              runs={pipelineRuns.filter((r) => r.source === 'vercel_cron')}
              fallbackUrl={null}
            />
            <RunsPanel
              title="GitHub Actions"
              icon={<GitBranch className="h-4 w-4 text-violet-400" />}
              runs={pipelineRuns.filter((r) => r.source === 'gh_actions')}
              fallbackUrl="https://github.com/aidirectory2026-prog/rightaichoice/actions"
            />
          </div>
        )}
      </Section>

      {/* ── 4.5 COST TRACKER (period-scoped) ──────────────────── */}
      <Section
        title={`Cost · ${RANGE_LABELS[range]}`}
        icon={<TrendingUp className="h-4 w-4 text-yellow-400" />}
      >
        <div className="mb-3 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <span className="text-2xl font-bold text-white tabular-nums">${costTotal.toFixed(2)}</span>
            <span className="text-xs text-zinc-500 ml-2">total across {costAggList.length} pipelines, {costRows.length} runs</span>
          </div>
          {overBudget.length > 0 && (
            <div className="text-xs px-2 py-1 rounded border border-amber-700/60 bg-amber-950/40 text-amber-200">
              ⚠ {overBudget.length} pipeline{overBudget.length === 1 ? '' : 's'} over $5/day:{' '}
              {overBudget.map(([k, v]) => `${k} ($${v.toFixed(2)})`).join(', ')}
            </div>
          )}
        </div>
        {costAggList.length === 0 ? (
          <Panel title="">
            <Empty>No cost data in this window yet. Once pipelines start logging via withPipelineLogging, totals appear here.</Empty>
          </Panel>
        ) : (
          <Panel title="">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Pipeline</th>
                  <th className="text-right py-1.5 font-medium w-16">Runs</th>
                  <th className="text-right py-1.5 font-medium w-20">DeepSeek</th>
                  <th className="text-right py-1.5 font-medium w-20">Anthropic</th>
                  <th className="text-right py-1.5 font-medium w-20">Apify</th>
                  <th className="text-right py-1.5 font-medium w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {costAggList.map((a) => {
                  const today = cost24hByPipeline.get(a.pipelineKey) ?? 0
                  const overFlag = today > 5
                  return (
                    <tr
                      key={a.pipelineKey}
                      className={`border-t border-zinc-800/40 ${overFlag ? 'bg-amber-950/20' : ''}`}
                    >
                      <td className="py-1.5 text-zinc-300">
                        {a.pipelineKey}
                        {overFlag && <span className="text-[10px] text-amber-400 ml-2">⚠ ${today.toFixed(2)} today</span>}
                      </td>
                      <td className="py-1.5 text-right text-zinc-500 tabular-nums">{a.runCount}</td>
                      <td className="py-1.5 text-right text-zinc-400 tabular-nums">${a.deepseekUsd.toFixed(3)}</td>
                      <td className="py-1.5 text-right text-zinc-400 tabular-nums">${a.anthropicUsd.toFixed(3)}</td>
                      <td className="py-1.5 text-right text-zinc-400 tabular-nums">${a.apifyUsd.toFixed(3)}</td>
                      <td className="py-1.5 text-right text-zinc-200 font-medium tabular-nums">${a.total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </Section>

      {/* ── 4.7 HEALTH SCORE (always 7d + 30d windows, trend) ──── */}
      <Section title="Pipeline health (7d + 30d)" icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
        {healthList.length === 0 ? (
          <Panel title="">
            <Empty>No pipeline runs in last 60 days. Health scores appear once pipelines start logging.</Empty>
          </Panel>
        ) : (
          <Panel title="">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Pipeline</th>
                  <th className="text-right py-1.5 font-medium w-20">7d ok</th>
                  <th className="text-right py-1.5 font-medium w-12">trend</th>
                  <th className="text-right py-1.5 font-medium w-20">30d ok</th>
                  <th className="text-right py-1.5 font-medium w-16">runs</th>
                  <th className="text-right py-1.5 font-medium w-24">mean (7d)</th>
                  <th className="text-right py-1.5 font-medium w-24">p95 (7d)</th>
                  <th className="text-left py-1.5 font-medium pl-3">errors (30d)</th>
                </tr>
              </thead>
              <tbody>
                {healthList.map((h) => {
                  const r7 = h.successRate7d
                  const r7p = h.successRate7dPrior
                  const r30 = h.successRate30d
                  const degrading = r7 != null && r7 < 0.9
                  const trend =
                    r7 != null && r7p != null
                      ? r7 > r7p + 0.05
                        ? { arrow: '↑', tone: 'text-emerald-400' }
                        : r7 < r7p - 0.05
                          ? { arrow: '↓', tone: 'text-rose-400' }
                          : { arrow: '→', tone: 'text-zinc-500' }
                      : null
                  const errs = Object.entries(h.errorClasses30d).sort((a, b) => b[1] - a[1])
                  return (
                    <tr
                      key={h.pipelineKey}
                      className={`border-t border-zinc-800/40 ${degrading ? 'bg-rose-950/15 border-l-2 border-l-rose-700' : ''}`}
                    >
                      <td className="py-1.5 pl-2 text-zinc-200">{h.pipelineKey}</td>
                      <td className={`py-1.5 text-right tabular-nums ${degrading ? 'text-rose-300 font-semibold' : 'text-zinc-300'}`}>
                        {r7 != null ? `${Math.round(r7 * 100)}%` : '—'}
                      </td>
                      <td className={`py-1.5 text-right ${trend?.tone ?? 'text-zinc-700'}`}>
                        {trend?.arrow ?? '·'}
                      </td>
                      <td className="py-1.5 text-right text-zinc-400 tabular-nums">
                        {r30 != null ? `${Math.round(r30 * 100)}%` : '—'}
                      </td>
                      <td className="py-1.5 text-right text-zinc-500 tabular-nums">{h.runCount30d}</td>
                      <td className="py-1.5 text-right text-zinc-500 tabular-nums">
                        {h.meanDuration7d != null ? `${(h.meanDuration7d / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-1.5 text-right text-zinc-500 tabular-nums">
                        {h.p95Duration7d != null ? `${(h.p95Duration7d / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-1.5 pl-3 text-zinc-500">
                        {errs.length === 0 ? (
                          <span className="text-emerald-600">·</span>
                        ) : (
                          <span className="space-x-1">
                            {errs.slice(0, 4).map(([cls, n]) => (
                              <span
                                key={cls}
                                className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400"
                                title={`${n} ${cls} errors in last 30d`}
                              >
                                {cls} <span className="text-zinc-200">{n}</span>
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </Section>

      {/* ── 5. DAILY HISTORY TABLE (60 days, existing) ──────────── */}
      <Section title="Daily history (60 days)" icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Date</th>
                <th className="text-right px-2 py-2 font-medium">Refreshed</th>
                <th className="text-right px-2 py-2 font-medium">New</th>
                <th className="text-right px-2 py-2 font-medium">Compares</th>
                <th className="text-right px-2 py-2 font-medium">Catalog</th>
                <th className="text-right px-2 py-2 font-medium">Backlog</th>
                <th className="text-right px-2 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {dailyHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                    No daily summaries yet. First snapshot fires nightly at 23:55 UTC.
                  </td>
                </tr>
              )}
              {(dailyHistory as Array<{ utc_date: string; tools_refreshed: number; tools_ingested: number; compares_regenerated: number; total_published_tools: number | null; cascade_backlog: number | null; health_flags: Record<string, unknown> }>).map((r) => {
                const flagCount = Object.keys(r.health_flags ?? {}).length
                return (
                  <tr key={r.utc_date} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="px-3 py-1.5 text-zinc-200">{r.utc_date}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">{r.tools_refreshed}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">{r.tools_ingested}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">{r.compares_regenerated}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-500 tabular-nums">{r.total_published_tools?.toLocaleString() ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-500 tabular-nums">{r.cascade_backlog?.toLocaleString() ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right">
                      {flagCount === 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                      ) : (
                        <span className="text-xs text-rose-400">{flagCount}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ── Components ──────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-zinc-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Panel({ title, right, children }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 italic">{children}</p>
}

function HealthLine({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        )}
        {label}
      </span>
      <span className="text-zinc-500 text-[11px]">{detail}</span>
    </li>
  )
}

function ActivityRow({
  slug,
  name,
  when,
  sub,
}: {
  slug: string
  name: string
  when: string
  sub?: string
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-xs py-0.5">
      <Link
        href={`/tools/${slug}`}
        target="_blank"
        className="text-zinc-200 hover:text-emerald-300 truncate min-w-0 flex-1"
      >
        {name}
        {sub && <span className="text-zinc-600 ml-1.5 text-[10px]">· {sub}</span>}
      </Link>
      <span className="text-[10px] text-zinc-500 shrink-0">{ago(when)}</span>
    </li>
  )
}

function ActivityCount({ count, more, type }: { count: number; more: boolean; type: string }) {
  return (
    <span className="text-[11px] text-zinc-400 flex items-center gap-2">
      <span className="text-zinc-300 tabular-nums">{count}</span>
      {more && (
        <Link
          href={`/admin/activity?type=${type}`}
          className="text-emerald-400 hover:text-emerald-300"
          title="View full list"
        >
          view all →
        </Link>
      )}
    </span>
  )
}

function RunsPanel({
  title,
  icon,
  runs,
  fallbackUrl,
}: {
  title: string
  icon: React.ReactNode
  runs: PipelineRunRow[]
  fallbackUrl: string | null
}) {
  const okCount = runs.filter((r) => r.status === 'success').length
  const failCount = runs.filter((r) => r.status === 'failure' || r.status === 'timeout').length
  const partialCount = runs.filter((r) => r.status === 'partial').length

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      }
      right={
        <span className="text-[11px] text-zinc-400 flex items-center gap-2">
          <span className="text-emerald-400">{okCount}</span>·{' '}
          {partialCount > 0 && (
            <>
              <span className="text-amber-400">{partialCount}</span>·{' '}
            </>
          )}
          <span className="text-rose-400">{failCount}</span>
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener"
              className="text-zinc-500 hover:text-emerald-300 ml-2"
              title="Open on GitHub"
            >
              ↗
            </a>
          )}
        </span>
      }
    >
      {runs.length === 0 ? (
        <Empty>No runs in this window</Empty>
      ) : (
        <ul className="space-y-0.5">
          {runs.slice(0, 30).map((r) => (
            <PipelineRunRow key={r.id} run={r} />
          ))}
          {runs.length > 30 && (
            <li className="text-[11px] text-zinc-500 italic pt-1">
              +{runs.length - 30} more in window (refine date range to see specific runs)
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}
