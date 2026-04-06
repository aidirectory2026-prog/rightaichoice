import { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'
import { discoverTools } from './discover'
import { dedup } from './dedup'
import { enrichTool } from './enrich'

interface IngestResult {
  runId: string
  discovered: number
  deduplicated: number
  enriched: number
  inserted: number
  failed: number
  insertedSlugs: string[]
}

export async function runIngestion(supabase: SupabaseClient): Promise<IngestResult> {
  const runId = crypto.randomUUID()
  const result: IngestResult = { runId, discovered: 0, deduplicated: 0, enriched: 0, inserted: 0, failed: 0, insertedSlugs: [] }

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

  // 3. Enrich + Insert (batch of 15 to stay within Vercel timeout)
  const batch = unique.slice(0, 15)

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

      // 4. Insert into tools table
      const slug = slugify(tool.name)
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
        last_verified_at: new Date().toISOString(),
        is_published: true,
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
