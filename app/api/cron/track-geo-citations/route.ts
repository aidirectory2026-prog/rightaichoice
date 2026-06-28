/**
 * Phase 13 D3.4 — weekly GEO citation tracker cron.
 *
 * Runs the chosen engine (free Gemini if GEMINI_API_KEY is set, else Anthropic web
 * search) over the target prompts and upserts geo_citation_snapshots — the GEO
 * analogue of the weekly GSC snapshot cron. Scheduled Mondays 07:15 UTC.
 *
 * If NO engine is enabled yet (e.g. before the free GEMINI_API_KEY is added), the
 * run records 'partial' and returns instead of throwing — so it does not fire a
 * weekly failure alert before the key is configured.
 *
 * REQUIRED VERCEL ENV: GEMINI_API_KEY (free) or a funded ANTHROPIC_API_KEY · CRON_SECRET
 */
import { cronRoute } from '@/lib/pipelines/with-logging'
import { runGeoTracking, pickDefaultEngine } from '@/lib/geo/run-tracking'
import { sendGeoReportEmail } from '@/lib/geo/geo-report-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export const GET = cronRoute({ pipelineKey: 'track-geo-citations' }, async (ctx) => {
  let engineId
  try {
    engineId = pickDefaultEngine()
  } catch {
    ctx.recordMetadata({ skipped: 'no_engine_enabled' })
    ctx.setStatus('partial')
    return { skipped: true, reason: 'no GEO engine enabled (set GEMINI_API_KEY)' }
  }
  const res = await runGeoTracking(ctx, { engineId, apply: true, log: (m) => console.log(m) })

  // Email the founder a report of this run (best-effort — never fail the data run on email).
  const email = await sendGeoReportEmail().catch((e) => ({
    ok: false,
    error: e instanceof Error ? e.message : String(e),
  }))
  ctx.recordMetadata({ email_sent: email.ok, email_error: email.ok ? undefined : (email as { error?: string }).error })

  return { ...res, email_sent: email.ok }
})
