import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/tools/[slug]/report
 * Returns cached report if fresh, or { status: "generating" } if stale/missing.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const rl = rateLimit('report-get', req, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  const { slug } = await params
  const supabase = await createClient()

  // Look up tool
  const { data: tool } = await supabase
    .from('tools')
    .select('id, name')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Check cache
  const { data: cached } = await supabase
    .from('tool_sentiment_cache')
    .select('*')
    .eq('tool_id', tool.id)
    .single()

  if (cached) {
    // If currently generating, return status
    if (cached.status === 'generating') {
      return NextResponse.json({ status: 'generating', tool_name: tool.name })
    }

    // If fresh (not expired), return full report
    const isExpired = new Date(cached.expires_at) < new Date()
    if (!isExpired && cached.status === 'ready') {
      return NextResponse.json({
        status: 'ready',
        tool_name: tool.name,
        report: {
          ai_verdict: cached.ai_verdict,
          pros: cached.pros,
          cons: cached.cons,
          sentiment_score: cached.sentiment_score,
          sentiment_breakdown: cached.sentiment_breakdown,
          themes: cached.themes,
          best_for: cached.best_for,
          not_for: cached.not_for,
          pricing_analysis: cached.pricing_analysis,
          community_buzz: cached.community_buzz,
          learning_curve: cached.learning_curve,
          integration_insights: cached.integration_insights,
          mention_count: cached.mention_count,
          sources_scraped: cached.sources_scraped,
          synthesized_at: cached.synthesized_at,
        },
      })
    }
  }

  // No cache or expired — return status and let client trigger generation
  return NextResponse.json({
    status: 'not_generated',
    tool_name: tool.name,
  })
}
