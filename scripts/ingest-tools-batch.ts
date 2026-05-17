/**
 * GH Actions-friendly batch ingest runner. Wraps lib/cron/ingest.ts
 * runIngestion() so a CI runner can fire it without hitting the Vercel
 * function timeout (Hobby = 60s, way too short for the traction-probe
 * step on a 50-candidate batch).
 *
 * USAGE
 *   npm run ingest:batch                 # default batch=50
 *   npm run ingest:batch -- --batch=25
 *
 * REQUIRED ENV (in GH Actions secrets)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *   ANTHROPIC_API_KEY  (curate gate still uses Anthropic for one call)
 *
 * Per-run cost: ~$0.50 DeepSeek + Anthropic for 50 candidates.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runIngestion } from '../lib/cron/ingest'

async function main() {
  const args = process.argv.slice(2)
  const batchArg = args.find((a) => a.startsWith('--batch='))
  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : 50

  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 200) {
    console.error(`Invalid --batch=${batchArg} — must be 1..200`)
    process.exit(1)
  }

  console.log(`[ingest:batch] starting run, batchSize=${batchSize}`)
  const t0 = Date.now()
  const supabase = getAdminClient()
  const result = await runIngestion(supabase, batchSize)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`[ingest:batch] done in ${elapsed}s`, JSON.stringify(result, null, 2))

  // Phase 9c hotfix (2026-05-17): only fail when literally zero new
  // tools inserted AND there were discoverable candidates. The
  // traction gate intentionally gates most candidates on quiet days,
  // so high gate rates aren't failures — they're the gate working.
  if (result.discovered > 0 && result.inserted === 0) {
    console.error(`⚠ ${result.discovered} discovered but 0 inserted — check curate/traction gates`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[ingest:batch] fatal:', err)
  process.exit(1)
})
