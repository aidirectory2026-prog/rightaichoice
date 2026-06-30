// Phase 13 D3.4 — shared GEO-tracking orchestration.
//
// One place that runs the chosen engine over the target prompts, analyzes the
// citations, and upserts geo_citation_snapshots. Called by BOTH the CLI script
// (scripts/track-geo-citations.ts) and the weekly cron
// (app/api/cron/track-geo-citations/route.ts), so behavior never drifts.

import type { PipelineCtx } from '../pipelines/with-logging'
import { getAdminClient } from '../cron/supabase-admin'
import { GEO_TARGET_PROMPTS } from './target-prompts'
import { getEngine, ENGINES, type EngineId } from './citation-engines'
import { analyzeCitations, type GeoSnapshotRow } from './track-citations'

export type RunOpts = {
  engineId?: EngineId
  snapshotDate?: string
  apply?: boolean
  limit?: number
  onlyPrompt?: string
  concurrency?: number
  /**
   * BUG-20: skip the real LLM engine call entirely and emit placeholder rows.
   * Lets you exercise the pipeline plumbing (logging, mapping, optional DB
   * write) with ZERO API cost. Without this, even a non-apply "dry run" still
   * makes paid engine calls — it only skips the DB write.
   */
  mock?: boolean
  log?: (msg: string) => void
}

// Auto-selected engines for the cron, in preference order. ONLY free/cheap
// web-grounded engines belong here — a GEO-citation engine MUST search the web
// and return the URLs it cited (DeepSeek/other plain LLMs can't, so they are
// not eligible). `claude_websearch` is deliberately NOT auto-selected: it runs
// on the paid ANTHROPIC_API_KEY and silently falling back to it is what
// produced the all-errored "credit balance too low" run. It stays available for
// EXPLICIT `--engine=claude_websearch` use once funded.
// NOTE: only IMPLEMENTED web-grounded engines may go here. `perplexity`/`openai`
// are still stubs (run() throws) — adding them before the adapter exists would
// re-create the all-errored run. So it's gemini-only until a real fallback ships.
const AUTO_ENGINE_ORDER: EngineId[] = ['gemini']

/** First enabled auto-eligible engine. Throws (→ cron skips cleanly) if none. */
export function pickDefaultEngine(): EngineId {
  for (const id of AUTO_ENGINE_ORDER) {
    if (ENGINES[id].isEnabled()) return id
  }
  throw new Error(
    'no auto GEO engine enabled — set GEMINI_API_KEY (free, aistudio.google.com). ' +
      'Anthropic is no longer an automatic fallback; run it explicitly with --engine=claude_websearch if funded.',
  )
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

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

export type RunResult = { engineId: EngineId; cited: number; total: number; wrote: boolean }

export async function runGeoTracking(ctx: PipelineCtx, opts: RunOpts = {}): Promise<RunResult> {
  const log = opts.log ?? (() => {})
  const engineId = opts.engineId ?? pickDefaultEngine()
  const engine = getEngine(engineId)
  if (!opts.mock && !engine.isEnabled()) throw new Error(`engine ${engineId} is not enabled — missing API key`)

  const snapshotDate = opts.snapshotDate ?? isoDate(new Date())
  const concurrency = Math.max(1, opts.concurrency ?? 2)

  let prompts = GEO_TARGET_PROMPTS
  if (opts.onlyPrompt) prompts = prompts.filter((p) => p.id === opts.onlyPrompt)
  if (opts.limit) prompts = prompts.slice(0, opts.limit)

  let cited = 0
  let tokensIn = 0
  let tokensOut = 0

  const rows = await mapLimit(prompts, concurrency, async (p): Promise<GeoSnapshotRow> => {
    if (opts.mock) {
      // BUG-20: no engine call, no cost — a clearly-marked placeholder row.
      log(`~ mock   [${p.id}] (engine skipped — no API call)`)
      return {
        snapshot_date: snapshotDate,
        engine: engineId,
        model: 'mock',
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
        answer_excerpt: '[mock — engine skipped]',
        error: null,
      }
    }
    try {
      const result = await engine.run(p.prompt)
      const a = analyzeCitations(result)
      tokensIn += a.tokensIn
      tokensOut += a.tokensOut
      if (a.cited) cited++
      log(
        `${a.cited ? '✓ CITED ' : a.retrieved ? '~ seen  ' : '✗ absent'} [${p.id}] ` +
          `rank=${a.citationRank ?? '-'} sov=${(a.shareOfVoice * 100).toFixed(0)}% ` +
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
      log(`✗ ERROR [${p.id}] ${msg}`)
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

  ctx.recordItems({
    processed: rows.length,
    succeeded: rows.filter((r) => !r.error).length,
    failed: rows.filter((r) => r.error).length,
  })
  if ((tokensIn || tokensOut) && engineId === 'claude_websearch') {
    ctx.recordTokens('anthropic', (process.env.GEO_CLAUDE_MODEL || 'claude-opus-4-8') as never, {
      in: tokensIn,
      out: tokensOut,
    })
  }
  ctx.recordMetadata({ engine: engineId, cited, prompts: rows.length, snapshot_date: snapshotDate })

  if (!opts.apply) {
    log(`DRY-RUN — skipping DB write (${cited}/${rows.length} cited).`)
    return { engineId, cited, total: rows.length, wrote: false }
  }

  const supa = getAdminClient()
  const { error } = await supa
    .from('geo_citation_snapshots')
    .upsert(rows as never, { onConflict: 'snapshot_date,engine,prompt_id' })
  if (error) throw new Error(`geo_citation_snapshots upsert failed: ${error.message}`)
  log(`✓ wrote ${rows.length} snapshot rows (${cited} cited).`)
  return { engineId, cited, total: rows.length, wrote: true }
}
