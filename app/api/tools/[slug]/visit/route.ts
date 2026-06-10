import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
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

// Fable-5 review (Dept A) — UA-regex alone missed crawlers with browser UAs
// fetching this URL directly: 1,762 of 1,836 tool_visit_redirected events in
// 14 days had referrer '/' + anon-IP distinct_ids (645 unique IPs). A real
// click on VisitWebsiteButton is a same-origin navigation: the browser sends
// Sec-Fetch-Site and/or a same-host Referer, and the button appends ?d= when
// Mixpanel is up. A request with NONE of those is a direct fetch — redirect
// it, but never count it.
function hasSameOriginEvidence(req: NextRequest): boolean {
  const sfs = req.headers.get('sec-fetch-site')
  if (sfs === 'same-origin' || sfs === 'same-site') return true
  if (sfs) return false // cross-site / none — direct fetch, not our button
  // Older browsers without Sec-Fetch-*: fall back to Referer host match.
  const referer = req.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).host === req.nextUrl.host
    } catch {
      return false
    }
  }
  // No Sec-Fetch-Site and no Referer: only count if the client button
  // stamped its Mixpanel distinct_id onto the URL.
  return !!req.nextUrl.searchParams.get('d')
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
  let destination = tool.affiliate_url ?? tool.website_url
  const isAffiliate = !!tool.affiliate_url

  // Dept B — tag plain website_url destinations with UTM params so vendors
  // see rightaichoice in their analytics (groundwork for affiliate
  // negotiations). Affiliate URLs are left untouched — their params are
  // controlled by the program. Existing utm_source on the destination wins.
  if (!isAffiliate && destination) {
    try {
      const u = new URL(destination)
      if (!u.searchParams.has('utm_source')) {
        const surface =
          new URL(req.url).searchParams.get('src')?.slice(0, 64) || 'site'
        u.searchParams.set('utm_source', 'rightaichoice')
        u.searchParams.set('utm_medium', 'referral')
        u.searchParams.set('utm_campaign', surface)
        destination = u.toString()
      }
    } catch {
      /* malformed website_url — redirect as stored */
    }
  }

  // Phase 9.0.2 — never count bots, crawlers, prefetch/prerender, or auto-HEAD
  // as affiliate clicks. This endpoint previously logged 1,014 redirects vs
  // only 4 client-side tool_visit_clicked events; much of that gap was
  // speculative/automated loads inflating revenue-critical click counts.
  // We still redirect them (harmless) but skip the click_logs insert + event.
  const countable = !isNonHumanRequest(req.headers, req.method) && hasSameOriginEvidence(req)

  if (countable) {
    // Log click — fire and forget. Dept A: must use the admin client — the
    // user-context client's insert was silently rejected by RLS for anon
    // visitors (click_logs had exactly 1 row ever while redirects flowed),
    // and `void` swallowed the error.
    const { data: { user } } = await supabase.auth.getUser()
    void getAdminClient()
      .from('click_logs')
      .insert({
        tool_id: tool.id,
        user_id: user?.id ?? null,
        source: isAffiliate ? 'affiliate_redirect' : 'visit_redirect',
      } as never)
      .then(({ error }) => {
        if (error) console.warn(`[visit] click_logs insert failed: ${error.message}`)
      })

    // Server-authoritative revenue event — fires even when client-side
    // tool_visit_clicked is killed by ad-blockers. Distinct_id flows in via ?d=
    // from VisitWebsiteButton so it lines up with the client mixpanel identity.
    const url = new URL(req.url)
    const clientDistinct = url.searchParams.get('d')?.slice(0, 64) || null
    const referrerPath = url.searchParams.get('ref')?.slice(0, 256) || '/'
    const distinctId = user?.id ?? clientDistinct ?? `anon-${getClientIp(req) ?? 'unknown'}`
    // Attribution-fix (2026-06-10) — pass the UA so the mirrored row stores
    // it; historical rows had user_agent=null, blocking retro bot analysis.
    void serverAnalytics.toolVisitRedirected(distinctId, slug, referrerPath, getClientIp(req), req.headers.get('user-agent'))
  }

  return NextResponse.redirect(destination, { status: 302 })
}
