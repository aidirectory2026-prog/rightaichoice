/**
 * GH Actions-friendly batch cascade runner. Wraps
 * lib/cron/cascade-editorials.ts runCompareEditorialCascade() so a
 * CI runner can regenerate stale compare-page editorials without
 * hitting Vercel's function timeout.
 *
 * USAGE
 *   npm run cascade:batch                # default batch=30
 *   npm run cascade:batch -- --batch=50
 *
 * REQUIRED ENV (in GH Actions secrets)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * Per-run cost: ~$0.005 × batch = ~$0.15 for 30 cascades.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runCompareEditorialCascade } from '../lib/cron/cascade-editorials'

async function main() {
  const args = process.argv.slice(2)
  const batchArg = args.find((a) => a.startsWith('--batch='))
  // Migration 133 raised the fan-out so a single tool change can flag every
  // referencing compare at once. Default lifted 30 → 120 so the GH Actions job
  // (60-min budget) drains the now-larger stalest-first queue instead of
  // chipping 30/day behind constant refresh churn. Cap stays 500 for headroom.
  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : 120

  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 500) {
    console.error(`Invalid --batch=${batchArg} — must be 1..200`)
    process.exit(1)
  }

  console.log(`[cascade:batch] starting run, batchSize=${batchSize}`)
  const t0 = Date.now()
  const supabase = getAdminClient()
  const result = await runCompareEditorialCascade(supabase, batchSize)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`[cascade:batch] done in ${elapsed}s`, JSON.stringify(result, null, 2))

  // Fail the job only when literally nothing succeeded — partial
  // success (e.g. 7/15) still ships fresh content and shouldn't mark
  // the entire GH Actions run red. The Knowledge Room dashboard
  // surfaces per-compare errors so the operator sees the detail.
  if (result.candidates > 0 && result.regenerated === 0) {
    console.error(`⚠ All ${result.candidates} cascades failed — investigate DeepSeek + zod caps`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[cascade:batch] fatal:', err)
  process.exit(1)
})
