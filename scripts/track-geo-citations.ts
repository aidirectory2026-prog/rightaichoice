/**
 * Phase 13 D3.4 — GEO citation tracker (the GEO equivalent of snapshot-gsc).
 *
 * For each curated target prompt, ask an AI engine that searches the web (v1:
 * Claude + web_search) and record whether rightaichoice.com is cited, its rank,
 * which competitors appeared, and a share-of-voice — one row per
 * (snapshot_date, engine, prompt_id) in geo_citation_snapshots. Idempotent upsert.
 *
 * USAGE:
 *   npm run geo:track:dry                       # run engine, print, NO db write
 *   npm run geo:track                           # run + upsert snapshot rows
 *   npm run geo:track -- --limit=2              # only the first 2 prompts (cheap smoke test)
 *   npm run geo:track -- --prompt=best-coding   # a single prompt by id
 *   npm run geo:track -- --engine=claude_websearch
 *   npm run geo:track -- --date=2026-06-27      # back-date the snapshot
 *
 * REQUIRED ENV:
 *   ANTHROPIC_API_KEY            (claude_websearch engine)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (apply mode only)
 *
 * COST: web_search runs server-side (~$0.01/search) + model tokens; budget ~$0.05–0.15
 * per prompt per engine. A full run of the default prompt set is well under $2.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runScriptedPipeline } from '../lib/pipelines/with-logging'
import { GEO_TARGET_PROMPTS } from '../lib/geo/target-prompts'
import { getEngine, type EngineId } from '../lib/geo/citation-engines'
import { analyzeCitations, type GeoSnapshotRow } from '../lib/geo/track-citations'

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run') || !args.includes('--apply')
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const engineId = (arg('engine') as EngineId) || 'claude_websearch'
const limit = arg('limit') ? parseInt(arg('limit')!, 10) : undefined
const onlyPrompt = arg('prompt')
const concurrency = arg('concurrency') ? Math.max(1, parseInt(arg('concurrency')!, 10)) : 2

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
const snapshotDate = arg('date') || isoDate(new Date())

async function mapLimit<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker))
  return out
}

async function main() {
  let prompts = GEO_TARGET_PROMPTS
  if (onlyPrompt) prompts = prompts.filter((p) => p.id === onlyPrompt)
  if (limit) prompts = prompts.slice(0, limit)

  const engine = getEngine(engineId)
  console.log(`Engine:        ${engineId} (enabled: ${engine.isEnabled()})`)
  console.log(`Prompts:       ${prompts.length}`)
  console.log(`Snapshot date: ${snapshotDate}`)
  console.log(`Mode:          ${isDry ? 'DRY-RUN (no db write)' : 'APPLY'}`)
  console.log(`Concurrency:   ${concurrency}\n`)

  if (!engine.isEnabled()) {
    throw new Error(`engine ${engineId} is not enabled — missing API key`)
  }

  await runScriptedPipeline(
    { source: 'gh_actions', pipelineKey: `geo-track-citations:${engineId}` },
    async (ctx) => {
      let cited = 0
      let totalTokensIn = 0
      let totalTokensOut = 0

      const rows = await mapLimit(prompts, concurrency, async (p): Promise<GeoSnapshotRow> => {
        try {
          const result = await engine.run(p.prompt)
          const a = analyzeCitations(result)
          totalTokensIn += a.tokensIn
          totalTokensOut += a.tokensOut
          if (a.cited) cited++
          console.log(
            `${a.cited ? '✓ CITED ' : a.retrieved ? '~ seen  ' : '✗ absent'} ` +
              `[${p.id}] rank=${a.citationRank ?? '-'} sov=${(a.shareOfVoice * 100).toFixed(0)}% ` +
              `sources=${a.allSources.length} competitors=[${a.competitors.filter((c) => c.cited).map((c) => c.domain).join(', ')}]`,
          )
          return {
            snapshot_date: snapshotDate,
            engine: engineId,
            model: a.model,
            prompt_id: p.id,
            prompt: p.prompt,
            prompt_category: p.category,
            cited: a.cited,
            retrieved: a.retrieved,
            citation_rank: a.citationRank,
            our_urls: a.ourUrls,
            competitors: a.competitors,
            all_sources: a.allSources,
            share_of_voice: a.shareOfVoice,
            answer_excerpt: a.answerExcerpt,
            error: null,
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.log(`✗ ERROR [${p.id}] ${msg}`)
          return {
            snapshot_date: snapshotDate,
            engine: engineId,
            model: null,
            prompt_id: p.id,
            prompt: p.prompt,
            prompt_category: p.category,
            cited: false,
            retrieved: false,
            citation_rank: null,
            our_urls: [],
            competitors: [],
            all_sources: [],
            share_of_voice: 0,
            answer_excerpt: '',
            error: msg,
          }
        }
      })

      ctx.recordItems({ processed: rows.length, succeeded: rows.filter((r) => !r.error).length, failed: rows.filter((r) => r.error).length })
      if (totalTokensIn || totalTokensOut) {
        ctx.recordTokens('anthropic', (process.env.GEO_CLAUDE_MODEL || 'claude-opus-4-8') as never, {
          in: totalTokensIn,
          out: totalTokensOut,
        })
      }
      ctx.recordMetadata({ cited, prompts: rows.length, engine: engineId })

      console.log(
        `\nSummary: ${cited}/${rows.length} prompts cited rightaichoice.com ` +
          `(citation rate ${((cited / rows.length) * 100).toFixed(0)}%).`,
      )

      if (isDry) {
        console.log('DRY-RUN — skipping DB write.')
        return { cited, total: rows.length }
      }

      const supa = getAdminClient()
      const { error } = await supa
        .from('geo_citation_snapshots')
        .upsert(rows as never, { onConflict: 'snapshot_date,engine,prompt_id' })
      if (error) throw new Error(`geo_citation_snapshots upsert failed: ${error.message}`)
      console.log(`✓ wrote ${rows.length} snapshot rows.`)
      return { cited, total: rows.length }
    },
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
