import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runIngestion } from '@/lib/cron/ingest'
import { submitToIndexNow } from '@/lib/indexnow'

export const maxDuration = 300

// Phase 8 freshness contract (2026-05-16):
// Fires twice daily (01:00 + 13:00 UTC) via vercel.json. Each fire
// enriches up to 25 candidates → 50 inserts/day target. Actual yield
// depends on what discovery sources return; some days hit 50, some
// fall short, occasional bursts exceed.

const handler = cronRoute({ pipelineKey: 'ingest-tools' }, async (ctx, request) => {
  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 50 ? batchParam : 25

  const supabase = getAdminClient()
  const result = await runIngestion(supabase, batchSize)

  ctx.recordItems({
    processed: result.discovered,
    succeeded: result.inserted,
    failed: result.failed,
  })
  ctx.recordMetadata({
    batchSize,
    insertedSlugs: result.insertedSlugs?.slice(0, 20),
    gated: result.gated,
  })

  if (result.inserted > 0 && result.insertedSlugs?.length) {
    const urls = result.insertedSlugs.map((s) => `/tools/${s}`)
    await submitToIndexNow(urls)
  }

  return { ...result, batchSize }
})

export const POST = handler
export const GET = handler
