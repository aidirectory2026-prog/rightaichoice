import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverAnalytics } from '@/lib/mixpanel-server'
import { isNonHumanRequest } from '@/lib/bot-detection'

type RouteContext = { params: Promise<{ slug: string }> }

function getClientIp(request: Request): string | undefined {
  const h = request.headers
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  )
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tool } = await supabase
    .from('tools')
    .select('id, website_url, affiliate_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Determine destination — prefer affiliate URL when set
  const destination = tool.affiliate_url ?? tool.website_url
  const isAffiliate = !!tool.affiliate_url

  // Phase 9.0.2 — never count bots, crawlers, prefetch/prerender, or auto-HEAD
  // as affiliate clicks. This endpoint previously logged 1,014 redirects vs
  // only 4 client-side tool_visit_clicked events; much of that gap was
  // speculative/automated loads inflating revenue-critical click counts.
  // We still redirect them (harmless) but skip the click_logs insert + event.
  const countable = !isNonHumanRequest(req.headers, req.method)

  if (countable) {
    // Log click — fire and forget
    const { data: { user } } = await supabase.auth.getUser()
    void supabase.from('click_logs').insert({
      tool_id: tool.id,
      user_id: user?.id ?? null,
      source: isAffiliate ? 'affiliate_redirect' : 'visit_redirect',
    })

    // Server-authoritative revenue event — fires even when client-side
    // tool_visit_clicked is killed by ad-blockers. Distinct_id flows in via ?d=
    // from VisitWebsiteButton so it lines up with the client mixpanel identity.
    const url = new URL(req.url)
    const clientDistinct = url.searchParams.get('d')?.slice(0, 64) || null
    const referrerPath = url.searchParams.get('ref')?.slice(0, 256) || '/'
    const distinctId = user?.id ?? clientDistinct ?? `anon-${getClientIp(req) ?? 'unknown'}`
    void serverAnalytics.toolVisitRedirected(distinctId, slug, referrerPath, getClientIp(req))
  }

  return NextResponse.redirect(destination, { status: 302 })
}
