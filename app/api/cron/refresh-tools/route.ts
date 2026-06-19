import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runRefresh } from '@/lib/cron/refresh'

export const maxDuration = 300

// Phase 8 freshness contract (2026-05-16):
// Scheduled hourly in vercel.json (`0 * * * *`). Each fire processes
// 10 stalest tools → 240 refreshes/day. Comfortably exceeds the
// "200 tools/day" freshness target with 20% headroom for failures.
//
// Manual ad-hoc fires can override the batch via `?batch=N`:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "https://rightaichoice.com/api/cron/refresh-tools?batch=15"

const handler = cronRoute({ pipelineKey: 'refresh-tools' }, async (ctx, request) => {
  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 25 ? batchParam : 10

  const supabase = getAdminClient()
  const result = await runRefresh(supabase, batchSize)

  type RefreshResult = {
    processed?: number
    refreshed?: number
    failed?: number
    slugs?: string[]
    scrapeBlocked?: number
    preserved?: number
    deepseekTokensIn?: number
    deepseekTokensOut?: number
  }
  const r = result as RefreshResult
  ctx.recordItems({
    processed: r.processed ?? batchSize,
    succeeded: r.refreshed,
    failed: r.failed,
  })
  // Phase 11 — record real DeepSeek spend so the in-app cost tracker stops showing $0.
  ctx.recordTokens('deepseek', 'deepseek-chat', {
    in: r.deepseekTokensIn ?? 0,
    out: r.deepseekTokensOut ?? 0,
  })
  // Phase 11 B5 — surface scrape outcome so a scraper degradation is visible even
  // though blocked-but-regenerated tools still count as succeeded (not failed).
  ctx.recordMetadata({
    batchSize,
    slugs: r.slugs?.slice(0, 20),
    scrapeBlocked: r.scrapeBlocked ?? 0,
    preserved: r.preserved ?? 0,
  })

  return { ...result, batchSize }
})

export const POST = handler
export const GET = handler
