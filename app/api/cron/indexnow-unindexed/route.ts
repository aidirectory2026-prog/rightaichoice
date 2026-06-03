import { cronRoute } from '@/lib/pipelines/with-logging'
import { submitToIndexNow } from '@/lib/indexnow'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

/**
 * POST /api/cron/indexnow-unindexed — Phase 9 B4 (2026-05-28).
 *
 * Re-pings IndexNow with the URLs GSC currently lists in any of the
 * un-indexed buckets:
 *   - Discovered - currently not indexed   (crawl budget)
 *   - Crawled - currently not indexed      (quality)
 *   - URL is unknown to Google             (never discovered)
 *
 * Source of truth: gsc_url_inspections (populated weekly by
 * scripts/audit-gsc-indexation.ts). Internal-linking fixes from the
 * sibling-rail bias surface these tools to humans; IndexNow tells the
 * crawler about them again. The two halves of doc-05 Bucket A.
 *
 * IndexNow accepts duplicate submissions across days, so re-pinging
 * weekly is harmless. We cap the per-run batch at MAX_PER_RUN because
 * Bing throttles submissions per host per day; the leftover gets picked
 * up on the next run.
 *
 * Excluded by design:
 *   - tool_comparisons with noindex=true
 *   - Anything that isn't a tool URL (compares are handled by
 *     /api/cron/indexnow-recent because the editorial pipeline emits
 *     them frequently)
 */
const MAX_PER_RUN = 200

const UNINDEXED_STATES = [
  'Discovered - currently not indexed',
  'Crawled - currently not indexed',
  'URL is unknown to Google',
]

export const POST = cronRoute({ pipelineKey: 'indexnow-unindexed' }, async (ctx) => {
  const db = getAdminClient()
  // Cast around the generated Database types — gsc_url_inspections was
  // added in migration 114 (2026-05-28); regenerate types to drop.
  const { data, error } = await (
    db as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (
            col: string,
            v: string,
          ) => {
            in: (
              col: string,
              vals: string[],
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => { limit: (n: number) => Promise<{ data: Array<{ url: string }> | null; error: { message: string } | null }> }
            }
          }
        }
      }
    }
  )
    .from('gsc_url_inspections')
    .select('url')
    .eq('page_type', 'tool')
    .in('coverage_state', UNINDEXED_STATES)
    .order('inspected_at', { ascending: true })
    .limit(MAX_PER_RUN)

  if (error) {
    throw new Error(`gsc_url_inspections read failed: ${error.message}`)
  }

  const urls = (data ?? []).map((r) => r.url)
  ctx.recordItems({ processed: urls.length, succeeded: urls.length })

  if (urls.length === 0) {
    return {
      success: true,
      submitted: 0,
      message: 'No un-indexed tool URLs to ping',
    }
  }

  await submitToIndexNow(urls)

  return {
    success: true,
    submitted: urls.length,
    cap: MAX_PER_RUN,
    message: `Re-pinged ${urls.length} un-indexed tool URLs to IndexNow`,
  }
})

// Vercel Cron invokes via GET. The Phase 8.d.3 refactor made this route
// POST-only, so the scheduled Vercel GET silently 405ed and the job never ran
// (0 runs). Alias GET → the same handler (as submit-urls-bing/snapshot-gsc do);
// POST stays for GitHub-Actions / manual curl triggers.
export const GET = POST
