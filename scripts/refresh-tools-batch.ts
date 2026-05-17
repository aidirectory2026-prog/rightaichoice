/**
 * GH Actions-friendly batch refresh runner. Wraps lib/cron/refresh.ts
 * runRefresh() so a CI runner can refresh 200+ tools in a single nightly
 * job (vs Vercel cron which is capped at ~10 per fire by the 300s
 * function timeout).
 *
 * USAGE
 *   npm run refresh:batch                 # default batch=200
 *   npm run refresh:batch -- --batch=100
 *
 * REQUIRED ENV (in GH Actions secrets)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * Per-run cost: ~$0.002 per tool × 200 = ~$0.40.
 * Wall-clock: ~25s per tool × 200 = ~83 min. Fits easily within GH
 * Actions' 6-hour job budget.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runRefresh } from '../lib/cron/refresh'

async function main() {
  const args = process.argv.slice(2)
  const batchArg = args.find((a) => a.startsWith('--batch='))
  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : 200

  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 1000) {
    console.error(`Invalid --batch=${batchArg} — must be 1..1000`)
    process.exit(1)
  }

  console.log(`[refresh:batch] starting nightly run, batchSize=${batchSize}`)
  const t0 = Date.now()
  const supabase = getAdminClient()
  const result = await runRefresh(supabase, batchSize)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(
    `[refresh:batch] done in ${elapsed}s — refreshed=${result.refreshed} failed=${result.failed}`,
  )

  // Fail the GH Action workflow if catastrophic — refreshed < 50% of attempted.
  // That triggers GH's email/notification surface so the operator notices.
  if (result.processed > 0 && result.refreshed / result.processed < 0.5) {
    console.error(`⚠ Refresh success rate below 50% — investigate`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[refresh:batch] fatal:', err)
  process.exit(1)
})
