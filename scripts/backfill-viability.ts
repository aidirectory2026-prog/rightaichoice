/**
 * Phase 4.5 audit fix (2026-05-09): backfill viability_score for the 540
 * published tools where it's currently NULL. calculateViabilityBatch
 * orders by viability_updated_at ASC NULLS FIRST, so each call pulls the
 * oldest-or-null tools first. Loop until processed=0 (no more rows to
 * touch). Static computation — no external API, no cost, just SQL writes.
 *
 * Run: tsx --env-file=.env.local scripts/backfill-viability.ts
 */

import { calculateViabilityBatch } from '@/lib/cron/viability'

const BATCH_SIZE = 50
const MAX_BATCHES = 30 // 1,178 / 50 + buffer

async function main() {
  console.log(`[backfill-viability] starting (batch ${BATCH_SIZE}, max ${MAX_BATCHES} iterations)`)
  let totalProcessed = 0
  let totalErrors = 0

  for (let i = 1; i <= MAX_BATCHES; i++) {
    const { processed, errors } = await calculateViabilityBatch(BATCH_SIZE)
    totalProcessed += processed
    totalErrors += errors.length

    if (processed === 0) {
      console.log(`[backfill-viability] batch ${i}: 0 processed — done.`)
      break
    }

    console.log(`[backfill-viability] batch ${i}: ${processed} processed, ${errors.length} errors`)
    if (errors.length > 0) {
      for (const err of errors.slice(0, 3)) console.log(`  ! ${err}`)
      if (errors.length > 3) console.log(`  ! …+${errors.length - 3} more`)
    }
  }

  console.log(`\n──────────────────────────────────────────`)
  console.log(`[backfill-viability] done: ${totalProcessed} processed, ${totalErrors} errors`)
  console.log(`──────────────────────────────────────────\n`)
}

main().catch((err) => {
  console.error('[backfill-viability] fatal:', err)
  process.exit(1)
})
