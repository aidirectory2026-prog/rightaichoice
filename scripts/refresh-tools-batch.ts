/**
 * GH Actions-friendly batch refresh runner. Wraps lib/cron/refresh.ts
 * runRefresh() so a CI runner can refresh 200+ tools in a single nightly
 * job (vs Vercel cron which is capped at ~10 per fire by the 300s
 * function timeout).
 *
 * USAGE
 *   npm run refresh:batch                                # default batch=200, stalest-first
 *   npm run refresh:batch -- --batch=100                 # custom batch size
 *   npm run refresh:batch -- --slugs-from=data/foo.txt   # retry a specific slug list
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

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { runRefresh, runRefreshForSlugs } from '../lib/cron/refresh'

function readSlugList(path: string): string[] {
  const raw = readFileSync(resolve(process.cwd(), path), 'utf8')
  const slugs = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
  // De-dupe while preserving order — failure logs often repeat entries.
  return Array.from(new Set(slugs))
}

async function main() {
  const args = process.argv.slice(2)
  const slugsArg = args.find((a) => a.startsWith('--slugs-from='))
  const batchArg = args.find((a) => a.startsWith('--batch='))

  const supabase = getAdminClient()
  const t0 = Date.now()

  if (slugsArg) {
    const path = slugsArg.split('=')[1]
    if (!path) {
      console.error('Missing path after --slugs-from=')
      process.exit(1)
    }
    const slugs = readSlugList(path)
    console.log(`[refresh:batch] retry mode — ${slugs.length} slugs from ${path}`)
    const result = await runRefreshForSlugs(supabase, slugs)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(
      `[refresh:batch] done in ${elapsed}s — processed=${result.processed} refreshed=${result.refreshed} failed=${result.failed}`,
    )
    if (result.processed > 0 && result.refreshed === 0) {
      console.error(`⚠ All ${result.processed} retry attempts failed — investigate`)
      process.exit(1)
    }
    return
  }

  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : 200
  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 1000) {
    console.error(`Invalid --batch=${batchArg} — must be 1..1000`)
    process.exit(1)
  }

  console.log(`[refresh:batch] starting nightly run, batchSize=${batchSize}`)
  const result = await runRefresh(supabase, batchSize)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(
    `[refresh:batch] done in ${elapsed}s — refreshed=${result.refreshed} failed=${result.failed}`,
  )

  // Phase 9c hotfix (2026-05-17): only fail when literally zero
  // refreshed — partial success still ships fresh content. Detail
  // surfaces in /admin/updates per-error drill-down.
  if (result.processed > 0 && result.refreshed === 0) {
    console.error(`⚠ All ${result.processed} refresh attempts failed — investigate`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[refresh:batch] fatal:', err)
  process.exit(1)
})
