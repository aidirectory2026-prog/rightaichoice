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
  }

  const { data: latest } = await db
    .from('geo_citation_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1)
  const snapshotDate = (latest as Array<{ snapshot_date: string }> | null)?.[0]?.snapshot_date
  if (!snapshotDate) return empty

  const { data: latestRows } = await db
    .from('geo_citation_snapshots')
    .select('engine, prompt_id, prompt_category, cited, retrieved, citation_rank, share_of_voice, competitors, error')
    .eq('snapshot_date', snapshotDate)
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
  const engine = (rows[0]?.engine as string) ?? null

  // Trend across recent snapshot dates (aggregate in JS).
  const { data: recent } = await db
    .from('geo_citation_snapshots')
    .select('snapshot_date, cited')
    .order('snapshot_date', { ascending: false })
    .limit(500)
  const byDate = new Map<string, { cited: number; total: number }>()
  for (const r of (recent ?? []) as Array<{ snapshot_date: string; cited: boolean }>) {
    const d = byDate.get(r.snapshot_date) ?? { cited: 0, total: 0 }
    d.total++
    if (r.cited) d.cited++
    byDate.set(r.snapshot_date, d)
  }
  const trend = Array.from(byDate.entries())
    .map(([date, v]) => ({ date, cited: v.cited, total: v.total, rate: v.total ? Math.round((v.cited / v.total) * 100) : 0 }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)

  // Top competitors cited in the latest run.
  const compCount = new Map<string, number>()
  for (const r of panelRows) for (const c of r.competitors) compCount.set(c.domain, (compCount.get(c.domain) ?? 0) + 1)
  const topCompetitors = Array.from(compCount.entries())
    .map(([domain, n]) => ({ domain, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)

  return { hasData: true, snapshotDate, engine, total, cited, rate: total ? Math.round((cited / total) * 100) : 0, rows: panelRows, trend, topCompetitors }
}
