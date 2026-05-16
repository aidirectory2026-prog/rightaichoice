import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Daily 23:55 UTC. Snapshots the day's activity across every freshness
// pipeline into a single `daily_update_summaries` row. Rendered at
// /admin/updates.
//
// Counts since 00:00 UTC today (open interval, not 24h sliding window) so
// each day's number maps exactly to the calendar day.

type SlugRow = { tool_slug?: string | null; slug?: string | null }
type CompareSlugRow = { slug: string | null }

async function handle(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const supabase = getAdminClient()
  const today = new Date().toISOString().slice(0, 10)
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

  // ── Bing direct submission lifetime delta — pulled from bing_submit_state
  const { data: bingState } = await supabase
    .from('bing_submit_state')
    .select('lifetime_submitted, last_run_utc')
    .eq('id', 1)
    .single()
  const bingToday =
    bingState && (bingState as { last_run_utc: string }).last_run_utc?.startsWith(today)
      ? // The state row only tracks lifetime — exact per-day delta needs
        // a separate log we don't have yet. Approximation: if the cron
        // ran today, ~100 URLs were submitted (the typical daily quota).
        100
      : 0

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
    compares_cascade_failed: 0, // cascade route doesn't currently persist failures
    tools_latest_updates_refreshed: latestRefreshedCount ?? 0,
    bing_urls_submitted: bingToday,
    indexnow_urls_pinged: 0, // TODO: needs an indexnow_logs table; skipped for v1
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

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...row })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
