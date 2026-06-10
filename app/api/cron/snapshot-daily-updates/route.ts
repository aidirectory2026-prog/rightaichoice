import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Daily 23:55 UTC. Snapshots the day's activity across every freshness
// pipeline into a single `daily_update_summaries` row. Rendered at
// /admin/updates.
//
// Counts since 00:00 UTC today (open interval, not 24h sliding window) so
// each day's number maps exactly to the calendar day.

type CompareSlugRow = { slug: string | null }

const handler = cronRoute({ pipelineKey: 'snapshot-daily-updates' }, async (ctx) => {
  const supabase = getAdminClient()
  // Phase 10 #40 — anchor the day on (now - 5 min) so a fire that slips past
  // 00:00 UTC (queue/cold-start latency) still files under the day it summarises
  // (it runs at 23:55). Prevents an almost-empty row landing on the next date.
  const ref = new Date(Date.now() - 5 * 60 * 1000)
  const today = ref.toISOString().slice(0, 10)
  const startISO = `${today}T00:00:00.000Z`

  // ── Pipeline 1: refresh-tools (last 24h, scoped to today UTC)
  const { data: refreshedRows } = await supabase
    .from('refresh_logs')
    .select('tool_slug, status')
    .gte('created_at', startISO)
  const refreshed = (refreshedRows ?? []) as Array<{ tool_slug: string | null; status: string }>
  const refreshedOk = refreshed.filter((r) => r.status === 'refreshed')
  const refreshedFailed = refreshed.filter((r) => r.status === 'failed')

  // ── Pipeline 2: ingest-tools
  const { data: insertedRows } = await supabase
    .from('tools')
    .select('slug')
    .gte('created_at', startISO)
    .eq('is_published', true)
  const ingested = (insertedRows as CompareSlugRow[]) ?? []

  const { data: gatedRows } = await supabase
    .from('ingestion_logs')
    .select('status')
    .gte('created_at', startISO)
    .in('status', ['gated', 'failed'])
  const gated = (gatedRows ?? []).filter((r: { status: string }) => r.status === 'gated').length
  const ingestFailed = (gatedRows ?? []).filter((r: { status: string }) => r.status === 'failed').length

  // ── Pipeline 3: cascade compare editorials
  const { data: cascadedRows } = await supabase
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
    .gte('last_reviewed_at', startISO)
  const cascaded = (cascadedRows as CompareSlugRow[]) ?? []

  // ── Latest-updates refresh (rolling per-tool timestamp)
  const { count: latestRefreshedCount } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .gte('latest_updates_at', startISO)

  // ── Bing direct submissions today — real count from the cron's own run
  // log (items_succeeded), not the old "assume 100 if it ran" approximation.
  // (Fable-5 review Dept A — dashboard previously showed a hardcoded 100.)
  const { data: bingRuns } = await supabase
    .from('pipeline_runs')
    .select('items_succeeded')
    .eq('pipeline_key', 'submit-urls-bing')
    .eq('status', 'success')
    .gte('started_at', startISO)
  const bingToday = ((bingRuns ?? []) as Array<{ items_succeeded: number | null }>).reduce(
    (sum, r) => sum + (r.items_succeeded ?? 0),
    0,
  )

  // ── IndexNow pings today — real count of pages stamped by cascade-hubs
  // (previously hardcoded 0 even when pings fired).
  const { count: indexnowToday } = await supabase
    .from('pages_freshness')
    .select('page_path', { count: 'exact', head: true })
    .gte('last_indexnow_at', startISO)

  // ── Catalog snapshot
  const { count: totalPublished } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)

  const { data: oldestRow } = await supabase
    .from('tools')
    .select('last_verified_at')
    .eq('is_published', true)
    .not('last_verified_at', 'is', null)
    .order('last_verified_at', { ascending: true })
    .limit(1)
    .single()

  const { count: backlogCount } = await supabase
    .from('v_stale_comparisons')
    .select('comparison_id', { count: 'exact', head: true })

  // ── Health flags — surface any pipeline red flags inline
  const healthFlags: Record<string, boolean | string> = {}
  if (refreshedOk.length < 100) healthFlags.refresh_red = true
  if (ingested.length === 0) healthFlags.ingest_zero = true
  if (cascaded.length === 0) healthFlags.cascade_zero = true
  if ((backlogCount ?? 0) > 1000) healthFlags.cascade_backlog_high = true

  // ── Upsert today's row
  const row = {
    utc_date: today,
    tools_refreshed: refreshedOk.length,
    tools_refresh_failed: refreshedFailed.length,
    tools_ingested: ingested.length,
    tools_ingest_gated: gated,
    tools_ingest_failed: ingestFailed,
    compares_regenerated: cascaded.length,
    compares_cascade_failed: 0,
    tools_latest_updates_refreshed: latestRefreshedCount ?? 0,
    bing_urls_submitted: bingToday,
    indexnow_urls_pinged: indexnowToday ?? 0,
    refreshed_slugs_sample: refreshedOk
      .map((r) => r.tool_slug)
      .filter((s): s is string => !!s)
      .slice(0, 10),
    ingested_slugs_sample: ingested
      .map((r) => r.slug)
      .filter((s): s is string => !!s)
      .slice(0, 10),
    cascaded_slugs_sample: cascaded
      .map((r) => r.slug)
      .filter((s): s is string => !!s)
      .slice(0, 10),
    total_published_tools: totalPublished ?? 0,
    oldest_last_verified_at:
      (oldestRow as { last_verified_at: string } | null)?.last_verified_at ?? null,
    cascade_backlog: backlogCount ?? 0,
    health_flags: healthFlags,
  }

  const { error } = await supabase
    .from('daily_update_summaries')
    .upsert(row as never, { onConflict: 'utc_date' })

  if (error) throw new Error(`upsert daily_update_summaries: ${error.message}`)

  ctx.recordItems({ processed: 1, succeeded: 1 })
  ctx.recordMetadata({ snapshot: row })
  return { ok: true, ...row }
})

export const GET = handler
export const POST = handler
