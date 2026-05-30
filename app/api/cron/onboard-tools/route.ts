import { cronRoute } from '@/lib/pipelines/with-logging'
import { onboardPendingTools } from '@/lib/cron/onboard'

export const maxDuration = 300

// Phase 9 onboarding (Workstream B): fast new-tool onboard.
//
// Scheduled every ~30 min in vercel.json. Each fire takes the oldest few
// tools with `onboarded_at IS NULL` and drives the per-tool refresh +
// categorize + viability + latest-updates steps to completion — so a
// freshly-ingested tool reaches parity within hours instead of waiting for
// the 24h nightly batches. Logo is left to the nightly backfill-logos job
// (see lib/cron/onboard.ts header).
//
// Idempotent: the `onboarded_at IS NULL` filter means re-running on an
// already-onboarded tool is a no-op. Small batch (default 5) keeps each fire
// well under maxDuration (refresh + latest-updates each do live fetches).
//
// Ad-hoc bigger batch: ?batch=N (1..15).

const handler = cronRoute({ pipelineKey: 'onboard-tools' }, async (ctx, request) => {
  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const limit =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 15 ? batchParam : 5

  const result = await onboardPendingTools(limit)

  ctx.recordItems({
    processed: result.processed,
    succeeded: result.onboarded,
    failed: result.processed - result.onboarded,
  })
  ctx.recordMetadata({
    limit,
    onboarded: result.onboarded,
    slugs: result.results.map((r) => r.slug).slice(0, 20),
    steps: result.results.slice(0, 20).map((r) => ({
      slug: r.slug,
      refreshed: r.refreshed,
      categorized: r.categorized,
      viability: r.viability,
      latestUpdates: r.latestUpdates,
      onboarded: r.onboarded,
      errors: r.errors.slice(0, 3),
    })),
  })
  if (result.processed > 0 && result.onboarded < result.processed) ctx.setStatus('partial')

  return { ok: true, ...result }
})

export const POST = handler
export const GET = handler
