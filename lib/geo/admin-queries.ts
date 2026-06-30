// Phase 13 D3.4 — read model for the automated GEO panel on /admin/ai-citations.
//
// Reads geo_citation_snapshots (admin/service-role) and shapes it for display:
// the latest run's citation rate + per-prompt status, a week-over-week trend,
// and the competitors winning the citations we want. Aggregation is in JS (low
// volume — a dozen prompts × a few engines per week).

import { getAdminClient } from '../cron/supabase-admin'

export type GeoPanelRow = {
  prompt_id: string
  prompt_category: string | null
  cited: boolean
  retrieved: boolean
  citation_rank: number | null
  share_of_voice: number | null
  competitors: Array<{ domain: string; cited: boolean }>
  error: string | null
}

export type GeoPanel = {
  hasData: boolean
  snapshotDate: string | null
  engine: string | null
  total: number
  cited: number
  rate: number
  rows: GeoPanelRow[]
  trend: Array<{ date: string; cited: number; total: number; rate: number }>
  topCompetitors: Array<{ domain: string; n: number }>
  // BUG (admin GEO panel): the LATEST run can be entirely engine-errored (e.g.
  // Anthropic credit exhausted), which previously rendered as a red "0%
  // citation rate" + a wall of "err" rows — indistinguishable from "we aren't
  // being cited". These fields let the page show the failure as an infra alert
  // and fall back to the last SUCCESSFUL run for the headline metrics.
  lastRunFailed: boolean
  lastRunError: string | null
  lastRunEngine: string | null
  lastRunDate: string | null
  showingStale: boolean // true when the displayed run isn't the latest run
}

/** Pull the human-readable message out of a raw engine/API error string
 *  (e.g. `400 {"type":"error","error":{"message":"…"}}`). */
function cleanEngineError(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = raw.match(/"message"\s*:\s*"([^"]+)"/)
  if (m) return m[1]
  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw
}

export async function loadGeoCitationPanel(): Promise<GeoPanel> {
  const db = getAdminClient()
  const empty: GeoPanel = {
    hasData: false,
    snapshotDate: null,
    engine: null,
    total: 0,
    cited: 0,
    rate: 0,
    rows: [],
    trend: [],
    topCompetitors: [],
    lastRunFailed: false,
    lastRunError: null,
    lastRunEngine: null,
    lastRunDate: null,
    showingStale: false,
  }

  // Pull recent snapshots once and bucket by (date, engine) so we can pick the
  // latest run that actually produced results — not a run that wholly errored.
  const { data: recentAll } = await db
    .from('geo_citation_snapshots')
    .select('snapshot_date, engine, cited, error')
    .order('snapshot_date', { ascending: false })
    .limit(1000)
  const recentRows = (recentAll ?? []) as Array<{ snapshot_date: string; engine: string | null; cited: boolean; error: string | null }>
  if (recentRows.length === 0) return empty

  type RunAgg = { date: string; engine: string | null; total: number; cited: number; errored: number; anyError: string | null }
  const runs = new Map<string, RunAgg>()
  for (const r of recentRows) {
    const key = `${r.snapshot_date}|${r.engine ?? ''}`
    const a = runs.get(key) ?? { date: r.snapshot_date, engine: r.engine, total: 0, cited: 0, errored: 0, anyError: null }
    a.total++
    if (r.cited) a.cited++
    if (r.error) { a.errored++; a.anyError = a.anyError ?? r.error }
    runs.set(key, a)
  }
  const runList = [...runs.values()] // already newest-first from the ordered query
  const latestRun = runList[0]
  const lastRunFailed = latestRun.total > 0 && latestRun.errored === latestRun.total

  // The run we DISPLAY metrics for: the most recent run with ≥1 non-errored
  // prompt. Falls back to the latest run if every recent run failed.
  const displayRun = runList.find((r) => r.total > r.errored) ?? latestRun
  const snapshotDate = displayRun.date

  const { data: latestRows } = await db
    .from('geo_citation_snapshots')
    .select('engine, prompt_id, prompt_category, cited, retrieved, citation_rank, share_of_voice, competitors, error')
    .eq('snapshot_date', snapshotDate)
    .eq('engine', displayRun.engine ?? '')
    .order('cited', { ascending: false })
  const rows = (latestRows ?? []) as Array<Record<string, unknown>>

  const panelRows: GeoPanelRow[] = rows.map((r) => ({
    prompt_id: r.prompt_id as string,
    prompt_category: (r.prompt_category as string) ?? null,
    cited: !!r.cited,
    retrieved: !!r.retrieved,
    citation_rank: (r.citation_rank as number) ?? null,
    share_of_voice: (r.share_of_voice as number) ?? null,
    competitors: ((r.competitors as Array<{ domain: string; cited: boolean }>) ?? []).filter((c) => c.cited),
    error: (r.error as string) ?? null,
  }))

  const cited = panelRows.filter((r) => r.cited).length
  const total = panelRows.length
  const engine = (rows[0]?.engine as string) ?? displayRun.engine ?? null

  // Trend across recent snapshot dates (reuse recentRows; exclude wholly-errored
  // runs so a failed run doesn't read as a 0% citation dip).
  const byDate = new Map<string, { cited: number; total: number; errored: number }>()
  for (const r of recentRows) {
    const d = byDate.get(r.snapshot_date) ?? { cited: 0, total: 0, errored: 0 }
    d.total++
    if (r.cited) d.cited++
    if (r.error) d.errored++
    byDate.set(r.snapshot_date, d)
  }
  const trend = Array.from(byDate.entries())
    .filter(([, v]) => v.total > v.errored) // drop fully-failed runs from the trend
    .map(([date, v]) => {
      const real = v.total - v.errored
      return { date, cited: v.cited, total: real, rate: real ? Math.round((v.cited / real) * 100) : 0 }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)

  // Top competitors cited in the latest run.
  const compCount = new Map<string, number>()
  for (const r of panelRows) for (const c of r.competitors) compCount.set(c.domain, (compCount.get(c.domain) ?? 0) + 1)
  const topCompetitors = Array.from(compCount.entries())
    .map(([domain, n]) => ({ domain, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)

  // Headline rate ignores errored prompts so an engine blip doesn't read as 0%.
  const erroredInDisplay = panelRows.filter((r) => r.error).length
  const realTotal = total - erroredInDisplay

  return {
    hasData: true,
    snapshotDate,
    engine,
    total: realTotal,
    cited,
    rate: realTotal ? Math.round((cited / realTotal) * 100) : 0,
    rows: panelRows,
    trend,
    topCompetitors,
    lastRunFailed,
    lastRunError: lastRunFailed ? cleanEngineError(latestRun.anyError) : null,
    lastRunEngine: latestRun.engine,
    lastRunDate: latestRun.date,
    showingStale: snapshotDate !== latestRun.date,
  }
}
