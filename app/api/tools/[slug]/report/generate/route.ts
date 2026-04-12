import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { scrapeAllSources } from '@/lib/scrapers'
import { synthesizeReport } from '@/lib/ai/synthesize-report'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow up to 2 minutes for scraping + synthesis

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * POST /api/tools/[slug]/report/generate
 * Triggers scraping + AI synthesis and stores the result.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const rl = rateLimit('report-generate', req, { limit: 3, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  const { slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // Look up tool with full data
  const { data: tool } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, description, pricing_type, pricing_details, skill_level, features, integrations, platforms')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Check if already generating
  const { data: existing } = await supabase
    .from('tool_sentiment_cache')
    .select('id, status, expires_at')
    .eq('tool_id', tool.id)
    .single()

  if (existing?.status === 'generating') {
    return NextResponse.json({ status: 'generating', message: 'Report generation already in progress' })
  }

  // If fresh cache exists, return it
  if (existing && existing.status === 'ready' && new Date(existing.expires_at) > new Date()) {
    return NextResponse.json({ status: 'ready', message: 'Report already cached and fresh' })
  }

  // Mark as generating (upsert)
  await admin
    .from('tool_sentiment_cache')
    .upsert(
      { tool_id: tool.id, status: 'generating', scraped_at: new Date().toISOString() },
      { onConflict: 'tool_id' }
    )

  try {
    // Step 1: Scrape all sources in parallel
    console.log(`[report] Scraping sources for "${tool.name}"...`)
    const scrapeResults = await scrapeAllSources(tool.name)
    console.log(`[report] Scraped ${scrapeResults.totalPosts} posts from ${scrapeResults.sourcesSucceeded.join(', ')}`)

    if (scrapeResults.totalPosts === 0) {
      // No data at all — still synthesize from tool info alone
      console.log(`[report] No scraped data, synthesizing from tool info only`)
    }

    // Step 2: Synthesize report via Claude
    console.log(`[report] Synthesizing report for "${tool.name}"...`)
    const report = await synthesizeReport(
      {
        name: tool.name,
        tagline: tool.tagline,
        description: tool.description,
        pricing_type: tool.pricing_type,
        pricing_details: tool.pricing_details,
        skill_level: tool.skill_level,
        features: tool.features,
        integrations: tool.integrations,
        platforms: tool.platforms,
      },
      scrapeResults
    )

    // Step 3: Store in cache
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

    console.log(`[report] Report ready for "${tool.name}"`)

    return NextResponse.json({
      status: 'ready',
      report,
      mention_count: scrapeResults.totalPosts,
      sources_scraped: scrapeResults.sourcesSucceeded,
    })
  } catch (err) {
    console.error(`[report] Generation failed for "${tool.name}":`, err)

    // Mark as failed
    await admin
      .from('tool_sentiment_cache')
      .upsert(
        { tool_id: tool.id, status: 'failed', scraped_at: new Date().toISOString() },
        { onConflict: 'tool_id' }
      )

    return NextResponse.json(
      { status: 'failed', error: 'Report generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
