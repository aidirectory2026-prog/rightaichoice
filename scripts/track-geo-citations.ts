/**
 * Phase 13 D3.4 — GEO citation tracker CLI (thin wrapper over lib/geo/run-tracking).
 *
 * USAGE:
 *   npm run geo:track:dry                       # run engine, print, NO db write
 *   npm run geo:track                           # run + upsert snapshot rows
 *   npm run geo:track -- --limit=2              # only the first 2 prompts (cheap smoke test)
 *   npm run geo:track -- --prompt=best-coding   # a single prompt by id
 *   npm run geo:track -- --engine=gemini        # force an engine (default: first enabled)
 *   npm run geo:track -- --date=2026-06-27      # back-date the snapshot
 *
 * REQUIRED ENV:
 *   GEMINI_API_KEY (free) or ANTHROPIC_API_KEY        (an enabled engine)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (apply mode only)
 */
export {}

import { runScriptedPipeline } from '../lib/pipelines/with-logging'
import { runGeoTracking, pickDefaultEngine } from '../lib/geo/run-tracking'
import type { EngineId } from '../lib/geo/citation-engines'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const engineId = (arg('engine') as EngineId) || undefined
const limit = arg('limit') ? parseInt(arg('limit')!, 10) : undefined

async function main() {
  const resolvedEngine = engineId ?? pickDefaultEngine()
  console.log(`Engine:        ${resolvedEngine}`)
  console.log(`Mode:          ${apply ? 'APPLY' : 'DRY-RUN (no db write)'}\n`)

  await runScriptedPipeline(
    { source: 'gh_actions', pipelineKey: `geo-track-citations:${resolvedEngine}` },
    (ctx) =>
      runGeoTracking(ctx, {
        engineId,
        apply,
        limit,
        onlyPrompt: arg('prompt'),
        concurrency: arg('concurrency') ? parseInt(arg('concurrency')!, 10) : undefined,
        snapshotDate: arg('date'),
        log: (m) => console.log(m),
      }),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
