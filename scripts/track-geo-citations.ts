/**
 * Phase 13 D3.4 — GEO citation tracker CLI (thin wrapper over lib/geo/run-tracking).
 *
 * USAGE:
 *   npm run geo:track:dry                       # CALLS the LLM engine (costs $), prints, NO db write
 *   npm run geo:track:dry -- --mock             # NO engine call, NO cost, NO db write (plumbing test)
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
// BUG-20: skip the paid LLM call entirely (plumbing-only test).
const mock = args.includes('--mock') || args.includes('--no-engine')
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const engineId = (arg('engine') as EngineId) || undefined
const limit = arg('limit') ? parseInt(arg('limit')!, 10) : undefined

async function main() {
  // In --mock we don't need an enabled engine; fall back to a label-only id.
  const resolvedEngine = engineId ?? (mock ? 'gemini' : pickDefaultEngine())
  console.log(`Engine:        ${resolvedEngine}${mock ? ' (mock — not called)' : ''}`)
  // BUG-20: an honest mode line. A plain dry-run STILL calls the engine (real,
  // paid LLM requests) and only skips the DB write — say so. --mock is the
  // genuinely-free path.
  const mode = mock
    ? 'MOCK (no engine call, no cost, no db write)'
    : apply
      ? 'APPLY (engine call + db write)'
      : 'DRY-RUN (engine IS called — costs $ — but no db write)'
  console.log(`Mode:          ${mode}\n`)

  await runScriptedPipeline(
    { source: 'gh_actions', pipelineKey: `geo-track-citations:${resolvedEngine}` },
    (ctx) =>
      runGeoTracking(ctx, {
        engineId,
        apply,
        mock,
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
