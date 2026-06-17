import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { scrapeAllSources } from '@/lib/scrapers'
import { synthesizeReport } from '@/lib/ai/synthesize-report'

export const maxDuration = 300 // 5 minutes for batch processing

const BATCH_SIZE = 5
const MAX_TOOLS = 100

type CronTool = {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  pricing_type: string
  pricing_details: string | null
  skill_level: string | null
  features: string[] | null
  integrations: string[] | null
  platforms: string[] | null
  view_count: number
}

export const POST = cronRoute({ pipelineKey: 'scrape-sentiment' }, async (ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // Get top 100 tools by view count
  const { data: tools, error: toolsError } = (await admin
    .from('tools')
    .select('id, name, slug, tagline, description, pricing_type, pricing_details, skill_level, features, integrations, platforms, view_count, website_url')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(MAX_TOOLS)) as { data: CronTool[] | null; error: { message: string } | null }

  if (toolsError || !tools) {
    throw new Error(`Failed to fetch tools: ${toolsError?.message ?? 'unknown'}`)
  }

  // Filter to tools that need scraping (no cache, expired, or failed)
  const toolIds = tools.map((t) => t.id)
  const { data: cachedData } = (await admin
    .from('tool_sentiment_cache')
    .select('tool_id, status, expires_at, scraped_at')
    .in('tool_id', toolIds)) as { data: { tool_id: string; status: string; expires_at: string; scraped_at: string | null }[] | null }

  const cachedMap = new Map(
    (cachedData ?? []).map((c) => [c.tool_id, c])
  )

  const needsScraping = tools.filter((tool) => {
    const cached = cachedMap.get(tool.id)
    if (!cached) return true
    if (cached.status === 'failed') return true
    if (cached.status === 'generating') {
      // H10 (Cowork QA): only skip a RECENT in-progress row. A 'generating' row
      // older than 30 min is from a run killed mid-scrape (timeout/deploy/crash)
      // and would otherwise wedge this tool's sentiment forever — regenerate it.
      const startedAt = cached.scraped_at ? new Date(cached.scraped_at).getTime() : 0
      return Date.now() - startedAt > 30 * 60 * 1000
    }
    return new Date(cached.expires_at) < new Date() // Expired
  })

  console.log(`[cron/scrape-sentiment] ${needsScraping.length} of ${tools.length} tools need scraping`)

  let processed = 0
  let failed = 0
  let deferred = 0
  const errors: string[] = []
  const succeededSlugs: string[] = []

  // Dept C (fable 5 review) — time budget. A big expired set (scrape + LLM
  // synthesis per tool) blew the 300s maxDuration in one run; Vercel killed
  // it mid-batch and the orphaned `running` row alerted as timeout
  // (2026-06-07). Stop STARTING batches past the deadline — every finished
  // tool is committed to tool_sentiment_cache; the next (now daily) run
  // continues with what's left.
  const deadlineMs = Date.now() + 240_000

  // Process in batches
  for (let i = 0; i < needsScraping.length; i += BATCH_SIZE) {
    if (Date.now() > deadlineMs) {
      deferred = needsScraping.length - i
      console.log(`[cron/scrape-sentiment] deadline reached — deferring ${deferred} tool(s) to the next run`)
      break
    }
    const batch = needsScraping.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (tool) => {
        try {
          // Mark as generating
          await admin
            .from('tool_sentiment_cache')
            .upsert(
              { tool_id: tool.id, status: 'generating', scraped_at: new Date().toISOString() },
              { onConflict: 'tool_id' }
            )

          const scrapeResults = await scrapeAllSources(tool.name, { website: (tool as { website_url?: string | null }).website_url })

          // Fable-5 review (2026-06-13) — honesty gate. 11 of the last 30
          // cached "sentiment reports" were synthesized from ZERO community
          // posts (the LLM invented community_buzz from the tool's own
          // metadata). If no source returned anything, store a failed row
          // (retried next run) instead of fabricating a report.
          if (scrapeResults.totalPosts === 0) {
            await admin
              .from('tool_sentiment_cache')
              .upsert(
                { tool_id: tool.id, status: 'failed', scraped_at: new Date().toISOString() },
                { onConflict: 'tool_id' }
              )
            failed++
            errors.push(`${tool.name}: no community data from any source — skipped synthesis`)
            return
          }

          const report = await synthesizeReport(
            {
              name: tool.name,
              tagline: tool.tagline,
              description: tool.description,
              pricing_type: tool.pricing_type,
              pricing_details: tool.pricing_details,
              skill_level: tool.skill_level ?? 'beginner',
              features: tool.features ?? undefined,
              integrations: tool.integrations ?? undefined,
              platforms: tool.platforms ?? undefined,
            },
            scrapeResults
          )

          const now = new Date().toISOString()
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

          await admin
            .from('tool_sentiment_cache')
            .upsert(
              {
                tool_id: tool.id,
                ai_verdict: report.ai_verdict,
                pros: report.pros,
                cons: report.cons,
                sentiment_score: report.sentiment_score,
                sentiment_breakdown: report.sentiment_breakdown,
                themes: report.themes,
                best_for: report.best_for,
                not_for: report.not_for,
                pricing_analysis: report.pricing_analysis,
                community_buzz: report.community_buzz,
                learning_curve: report.learning_curve,
                integration_insights: report.integration_insights,
                raw_reddit: scrapeResults.reddit.posts,
                raw_twitter: scrapeResults.twitter.posts,
                raw_quora: scrapeResults.quora.posts,
                raw_g2: scrapeResults.g2.posts,
                mention_count: scrapeResults.totalPosts,
                sources_scraped: scrapeResults.sourcesSucceeded,
                status: 'ready',
                scraped_at: now,
                synthesized_at: now,
                expires_at: expiresAt,
              },
              { onConflict: 'tool_id' }
            )

          processed++
          succeededSlugs.push(tool.slug)
          console.log(`[cron/scrape-sentiment] Done: ${tool.name} (${scrapeResults.totalPosts} posts)`)
        } catch (err) {
          failed++
          const msg = `${tool.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          errors.push(msg)
          console.error(`[cron/scrape-sentiment] Failed: ${msg}`)

          await admin
            .from('tool_sentiment_cache')
            .upsert(
              { tool_id: tool.id, status: 'failed', scraped_at: new Date().toISOString() },
              { onConflict: 'tool_id' }
            )
        }
      })
    )
  }

  ctx.recordItems({ processed: needsScraping.length - deferred, succeeded: processed, failed })
  ctx.recordMetadata({
    total_top_tools: tools.length,
    needed_scraping: needsScraping.length,
    deferred,
    succeeded_slugs: succeededSlugs.slice(0, 20),
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  })
  if ((failed > 0 || deferred > 0) && processed > 0) ctx.setStatus('partial')

  return {
    ok: true,
    total: tools.length,
    needed_scraping: needsScraping.length,
    processed,
    failed,
    deferred,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  }
})

// Vercel Cron invokes via GET. The Phase 8.d.3 refactor made this route
// POST-only, so the scheduled Vercel GET silently 405ed and the job never ran
// (0 runs). Alias GET → the same handler (as submit-urls-bing/snapshot-gsc do);
// POST stays for GitHub-Actions / manual curl triggers.
export const GET = POST
