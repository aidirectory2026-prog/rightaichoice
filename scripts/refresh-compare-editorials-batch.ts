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
  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : 30

  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 200) {
    console.error(`Invalid --batch=${batchArg} — must be 1..200`)
    process.exit(1)
  }

  console.log(`[cascade:batch] starting run, batchSize=${batchSize}`)
  const t0 = Date.now()
  const supabase = getAdminClient()
  const result = await runCompareEditorialCascade(supabase, batchSize)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`[cascade:batch] done in ${elapsed}s`, JSON.stringify(result, null, 2))

  if (result.failed > batchSize / 2) {
    console.error(`⚠ More than half the cascades failed (${result.failed}/${result.candidates})`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[cascade:batch] fatal:', err)
  process.exit(1)
})
