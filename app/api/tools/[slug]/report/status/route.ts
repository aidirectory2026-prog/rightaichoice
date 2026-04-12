import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/tools/[slug]/report/status
 * Polling endpoint — returns current generation status.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tool } = await supabase
    .from('tools')
    .select('id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const { data: cached } = await supabase
    .from('tool_sentiment_cache')
    .select('status, synthesized_at')
    .eq('tool_id', tool.id)
    .single()

  if (!cached) {
    return NextResponse.json({ status: 'not_generated' })
  }

  return NextResponse.json({
    status: cached.status,
    synthesized_at: cached.synthesized_at,
  })
}
