/**
 * 1.1 freshness-cascade — hourly cascade-hubs cron.
 *
 * Reads pages_freshness for rows where `last_revalidated_at` is missing
 * or older than `last_changed_at`, then:
 *
 *   1) revalidatePath(page_path)   — refresh Next.js ISR cache
 *   2) submitToIndexNow(urls)      — push to Bing/Yandex
 *   3) stamp last_revalidated_at + last_indexnow_at on the rows
 *
 * Also performs a safety re-sweep: any tools whose updated_at is within
 * the last 65 minutes get propagate_freshness() invoked, in case the
 * SQL trigger missed something (transient connection error, etc.).
 *
 * Vercel cron schedule: `0 * * * *` (hourly) — set in vercel.json.
 */
import { cronRoute } from '@/lib/pipelines/with-logging'
import { submitToIndexNow } from '@/lib/indexnow'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { revalidatePath } from 'next/cache'

export const maxDuration = 60

const BASE = 'https://rightaichoice.com'
const MAX_PER_RUN = 500 // cap to keep within 60s budget
const SAFETY_WINDOW_MIN = 65

export const POST = cronRoute({ pipelineKey: 'cascade-hubs' }, async (ctx) => {
  // pages_freshness + propagate_freshness RPC not yet in generated Supabase
  // types (added in migration 103) — cast around it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any

  // ----- (1) Safety re-sweep -----
  // Any tool whose updated_at is within the last 65 min — call
  // propagate_freshness to make sure the cascade ran. This is a belt-and-
  // suspenders pass for missed triggers.
  const safetyCutoff = new Date(Date.now() - SAFETY_WINDOW_MIN * 60 * 1000).toISOString()
  const { data: recentTools, error: recentErr } = await db
    .from('tools')
    .select('slug')
    .gte('updated_at', safetyCutoff)
    .eq('is_published', true)
    .limit(MAX_PER_RUN)

  if (recentErr) {
    console.warn(`[cascade-hubs] safety-sweep tools query failed: ${recentErr.message}`)
  }

  let safetyCalls = 0
  for (const t of (recentTools ?? []) as Array<{ slug: string }>) {
    const { error } = await db.rpc('propagate_freshness', {
      p_tool_slug: t.slug,
      p_source: 'cron_sweep',
      p_event: 'safety_resweep',
      p_reason: null,
    })
    if (!error) safetyCalls++
  }

  // ----- (2) Fetch the "needs ISR" set -----
  // Rows where last_revalidated_at is null OR last_revalidated_at < last_changed_at.
  // Phase 10 #14 — read from the pages_freshness_needs_isr VIEW: PostgREST can't
  // do column-to-column comparison in a .or() filter (it treated last_changed_at
  // as a string literal, erroring the whole run), so the comparison lives in SQL.
  const { data: pending, error: pendErr } = await db
    .from('pages_freshness_needs_isr')
    .select('page_path, last_changed_at, last_revalidated_at')
    .order('last_changed_at', { ascending: false })
    .limit(MAX_PER_RUN)

  if (pendErr) {
    throw new Error(`pages_freshness pending query failed: ${pendErr.message}`)
  }

  const rows = (pending ?? []) as Array<{
    page_path: string
    last_changed_at: string
    last_revalidated_at: string | null
  }>

  ctx.recordItems({ processed: rows.length })

  if (rows.length === 0) {
    return {
      success: true,
      revalidated: 0,
      indexnow_submitted: 0,
      safety_resweeps: safetyCalls,
      message: 'No pages need cascading',
    }
  }

  // ----- (3) revalidatePath for each URL -----
  let revalidated = 0
  for (const row of rows) {
    try {
      revalidatePath(row.page_path)
      revalidated++
    } catch (err) {
      console.warn(
        `[cascade-hubs] revalidatePath(${row.page_path}) failed:`,
        (err as Error).message
      )
    }
  }

  // ----- (4) IndexNow push (deduped + capped) -----
  const fullUrls = rows.map((r) => `${BASE}${r.page_path}`)
  // submitToIndexNow already chunks; we just need to fire it.
  try {
    await submitToIndexNow(fullUrls)
  } catch (err) {
    console.warn(`[cascade-hubs] IndexNow submit failed:`, (err as Error).message)
  }

  // ----- (5) Stamp last_revalidated_at + last_indexnow_at -----
  const nowIso = new Date().toISOString()
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK).map((r) => r.page_path)
    const { error } = await db
      .from('pages_freshness')
      .update({ last_revalidated_at: nowIso, last_indexnow_at: nowIso })
      .in('page_path', slice)
    if (error) {
      console.warn(`[cascade-hubs] stamp update failed at ${i}:`, error.message)
    }
  }

  ctx.recordItems({ succeeded: revalidated })

  return {
    success: true,
    revalidated,
    indexnow_submitted: fullUrls.length,
    safety_resweeps: safetyCalls,
    message: `Cascaded ${revalidated} pages, IndexNow=${fullUrls.length}, safety-resweeps=${safetyCalls}`,
  }
})

// Phase 10 #13 — Vercel cron fires GET; without this the route 405s on every
// scheduled run. (Scheduled hourly in vercel.json — Phase 10 #4.)
export const GET = POST
