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

  // Failure policy — distinguish a genuine outage from a working gate.
  //
  // History: this used to `exit(1)` whenever (deduplicated>0 && inserted===0).
  // But 0-inserted is NOT inherently a failure: the curate/traction gate
  // intentionally rejects candidates that don't clear the quality bar — a high
  // gate rate is the gate WORKING. Collapsing "gate rejected everything" into a
  // hard CI failure is exactly what made this workflow go red EVERY day once the
  // Reddit traction signal went dark (no creds in CI → the gate rejected ~100%)
  // — the 2026-07-01 "automations failing / timing out" report. The gate itself
  // is fixed in curate.ts (it no longer hard-rejects when Reddit is unmeasured),
  // so insertion resumes; this exit policy stops the false alarms regardless.
  //
  // A 0-insert day is now a warning, not a failure. We reserve exit(1) for a real
  // outage: candidates were enriched-able but enrichment produced ZERO output,
  // which means DeepSeek (or the enrichment path) is down — actionable, page-worthy.
  const enrichmentDead = result.deduplicated > 0 && result.enriched === 0
  if (enrichmentDead) {
    console.error(`✗ ${result.deduplicated} unique candidates but enrichment produced 0 — DeepSeek/enrichment outage`)
    process.exit(1)
  }
  if (result.deduplicated > 0 && result.inserted === 0) {
    console.warn(`ℹ ${result.deduplicated} unique candidates, 0 cleared the quality gate today (reddit probes healthy: ${result.redditProbesOk}/${result.probesTotal}) — gate working, not a failure`)
  }
  if (result.discovered > 0 && result.deduplicated === 0) {
    console.warn(`ℹ ${result.discovered} discovered, all duplicates — catalog is comprehensive today`)
  }
}

main().catch((err) => {
  console.error('[ingest:batch] fatal:', err)
  process.exit(1)
})
