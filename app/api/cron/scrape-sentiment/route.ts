import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
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

export async function POST(request: Request) {
  const unauthorized = validateCronSecret(request)
  if (unauthorized) return unauthorized

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // Get top 100 tools by view count
  const { data: tools, error: toolsError } = (await admin
    .from('tools')
    .select('id, name, slug, tagline, description, pricing_type, pricing_details, skill_level, features, integrations, platforms, view_count')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(MAX_TOOLS)) as { data: CronTool[] | null; error: { message: string } | null }

  if (toolsError || !tools) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch tools' }, { status: 500 })
  }

  // Filter to tools that need scraping (no cache, expired, or failed)
  const toolIds = tools.map((t) => t.id)
  const { data: cachedData } = (await admin
    .from('tool_sentiment_cache')
    .select('tool_id, status, expires_at')
    .in('tool_id', toolIds)) as { data: { tool_id: string; status: string; expires_at: string }[] | null }

  const cachedMap = new Map(
    (cachedData ?? []).map((c: { tool_id: string; status: string; expires_at: string }) => [c.tool_id, c])
  )

  const needsScraping = tools.filter((tool) => {
    const cached = cachedMap.get(tool.id)
    if (!cached) return true
    if (cached.status === 'failed') return true
    if (cached.status === 'generating') return false // Skip in-progress
    return new Date(cached.expires_at) < new Date() // Expired
  })

  console.log(`[cron/scrape-sentiment] ${needsScraping.length} of ${tools.length} tools need scraping`)

  let processed = 0
  let failed = 0
  const errors: string[] = []

  // Process in batches
  for (let i = 0; i < needsScraping.length; i += BATCH_SIZE) {
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

          const scrapeResults = await scrapeAllSources(tool.name)
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

  return NextResponse.json({
    ok: true,
    total: tools.length,
    needed_scraping: needsScraping.length,
    processed,
    failed,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  })
}
