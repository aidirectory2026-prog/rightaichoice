import { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'
import { discoverTools } from './discover'
import { dedup } from './dedup'
import { enrichTool } from './enrich'
import { loadCurateContext, curateCandidate } from './curate'
import { probeTractionBatch } from './traction-probe'

interface IngestResult {
  runId: string
  discovered: number
  deduplicated: number
  enriched: number
  gated: number
  inserted: number
  failed: number
  insertedSlugs: string[]
}

// Phase 8 freshness contract (2026-05-16):
// Target: 50 new tools/day. Vercel cron fires this at 01:00 + 13:00 UTC
// (twice daily); each fire enriches up to `batchSize` candidates. With
// batch=25 we get 50 inserts/day. The real net-new yield depends on
// discovery sources — most days 30-50, some days bursts past 50.
export async function runIngestion(
  supabase: SupabaseClient,
  batchSize = 25,
): Promise<IngestResult> {
  const runId = crypto.randomUUID()
  const result: IngestResult = { runId, discovered: 0, deduplicated: 0, enriched: 0, gated: 0, inserted: 0, failed: 0, insertedSlugs: [] }

  const curateCtx = await loadCurateContext(supabase)
  // Phase 8 (2026-05-16): raise the soft-criteria minimum from 2 → 3.
  // "Most trending, going viral" requires more than just appearing on a
  // curated list — combined with the new traction-hard gate (HN/Reddit
  // probe below), this filters out tools without real-world buzz.
  curateCtx.minCriteria = 3

  // 1. Discover
  const raw = await discoverTools()
  result.discovered = raw.length
  console.log(`[ingest:${runId}] Discovered ${raw.length} tools`)

  // Log discoveries
  for (const tool of raw) {
    await supabase.from('ingestion_logs').insert({
      run_id: runId,
      source: tool.source,
      tool_name: tool.name,
      tool_slug: slugify(tool.name),
      status: 'discovered',
    })
  }

  // 2. Dedup
  const unique = await dedup(raw, supabase)
  result.deduplicated = unique.length
  console.log(`[ingest:${runId}] ${unique.length} unique after dedup`)

  // Mark duplicates
  const uniqueNames = new Set(unique.map(t => t.name))
  for (const tool of raw) {
    if (!uniqueNames.has(tool.name)) {
      await supabase.from('ingestion_logs').insert({
        run_id: runId,
        source: tool.source,
        tool_name: tool.name,
        tool_slug: slugify(tool.name),
        status: 'duplicate',
      })
    }
  }

  // 3. Enrich + Insert. batchSize defaults to 25 (fits 300s Pro maxDuration);
  // caller can override for ad-hoc bigger pushes.
  const batch = unique.slice(0, batchSize)

  // 3a. Traction probes (HN + Reddit) for the batch — run in parallel
  // so per-batch overhead is ~5s instead of 50s sequential. The probe
  // result feeds the traction-hard gate inside curate.
  console.log(`[ingest:${runId}] probing traction for ${batch.length} candidates…`)
  const tractionMap = await probeTractionBatch(
    batch.map((t) => t.name),
    5,
  )

  for (const tool of batch) {
    try {
      const enriched = await enrichTool(tool.name, tool.url, tool.description)
      if (!enriched) {
        result.failed++
        await supabase.from('ingestion_logs').insert({
          run_id: runId,
          source: tool.source,
          tool_name: tool.name,
          tool_slug: slugify(tool.name),
          status: 'failed',
          error_message: 'Enrichment returned null',
        })
        continue
      }

      result.enriched++

      // 4. Curation gate — soft criteria (≥3/5) + traction-hard probe.
      const traction = tractionMap.get(tool.name)
      const decision = curateCandidate(
        {
          name: tool.name,
          websiteUrl: tool.url,
          enriched,
          signals: {
            recentList: true,
            usageSignal: traction
              ? { redditThreads: traction.reddit.threadCount }
              : undefined,
            tractionHard: traction
              ? {
                  hnPoints: traction.hn.maxPoints,
                  redditThreads: traction.reddit.threadCount,
                  score: traction.score,
                  hardPass: traction.hardPass,
                  probed: traction.probed,
                }
              : undefined,
          },
        },
        curateCtx,
      )
      if (!decision.pass) {
        result.gated++
        await supabase.from('ingestion_logs').insert({
          run_id: runId,
          source: tool.source,
          tool_name: tool.name,
          tool_slug: decision.slug,
          status: 'gated',
          error_message: decision.reasons.join(','),
        })
        continue
      }

      // 5. Insert into tools table
      const slug = decision.slug
      curateCtx.existingSlugs.add(slug) // protect later iterations in this run
      const { error: insertError } = await supabase.from('tools').insert({
        name: tool.name,
        slug,
        tagline: enriched.tagline,
        description: enriched.description,
        website_url: tool.url,
        pricing_type: enriched.pricing_type,
        pricing_details: enriched.pricing_details,
        skill_level: enriched.skill_level,
        has_api: enriched.has_api,
        platforms: enriched.platforms,
        features: enriched.features,
        integrations: enriched.integrations,
        best_for: enriched.best_for,
        not_for: enriched.not_for,
        editorial_verdict: enriched.editorial_verdict,
        // Step 40 depth fields — now populated in the same enrichment pass
        tutorial_urls: enriched.tutorial_urls,
        limitations: enriched.limitations,
        models: enriched.models,
        community_links: enriched.community_links,
        use_cases: enriched.use_cases,
        our_views: enriched.our_views,
        // Anti-starvation (Phase 9 onboarding): leave the three freshness
        // columns NULL on insert so the stalest-first pipelines grab a brand-new
        // tool FIRST. onboarded_at also defaults to NULL.
        last_verified_at: null,
        // Phase 10 #51 — DRAFT-until-green. New tools insert UNPUBLISHED and only
        // go live once the gated SOP lane (onboard-tools?mode=sop, scheduled in
        // vercel.json) confirms all quality gates pass (categories, ≥3 alts, ≥2
        // editorial compares, ≥9 FAQs, editorial fields, logo). Prevents users +
        // Google seeing half-built pages in the window before onboarding finishes.
        is_published: false,
      })

      if (insertError) {
        result.failed++
        await supabase.from('ingestion_logs').insert({
          run_id: runId,
          source: tool.source,
          tool_name: tool.name,
          tool_slug: slug,
          status: 'failed',
          error_message: insertError.message,
        })
      } else {
        result.inserted++
        result.insertedSlugs.push(slug)
        await supabase.from('ingestion_logs').insert({
          run_id: runId,
          source: tool.source,
          tool_name: tool.name,
          tool_slug: slug,
          status: 'inserted',
        })
      }
    } catch (e) {
      result.failed++
      await supabase.from('ingestion_logs').insert({
        run_id: runId,
        source: tool.source,
        tool_name: tool.name,
        tool_slug: slugify(tool.name),
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  console.log(`[ingest:${runId}] Done: ${result.inserted} inserted, ${result.failed} failed`)
  return result
}
