import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

// Phase 4 dedup follow-up (2026-05-07): the page-handler-level
// permanentRedirect emits a meta-refresh in streaming contexts instead of
// HTTP 308. The proxy runs BEFORE the page handler / streaming begins, so
// returning NextResponse.redirect(url, 308) here gives a true 308 with no
// body — the right signal for SEO crawlers.
//
// Match: /tools/<slug> (single segment, no sub-paths). Sub-paths like
// /tools/<slug>/alternatives or /tools/<slug>/report aren't merged URLs.
const TOOL_SLUG_REGEX = /^\/tools\/([a-z0-9][a-z0-9-]{0,80})\/?$/

async function maybeMergedToolRedirect(request: NextRequest): Promise<NextResponse | null> {
  const match = request.nextUrl.pathname.match(TOOL_SLUG_REGEX)
  if (!match) return null
  const slug = match[1]

  // Anon client — RLS policy 'public read tools' (migration 077) allows
  // SELECT on rows where merged_into IS NOT NULL even when is_published=false.
  // Cookies aren't needed for this query, so use a no-op cookie shim to keep
  // the function pure + cheap.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data } = await supabase
    .from('tools')
    .select('merged_into')
    .eq('slug', slug)
    .not('merged_into', 'is', null)
    .maybeSingle()

  const merged = (data as { merged_into: string | null } | null)?.merged_into
  if (!merged) return null

  const url = request.nextUrl.clone()
  url.pathname = `/tools/${merged}`
  // Preserve query string + hash so backlinks like /tools/old-slug?utm_x=y
  // hit the canonical page with the same query state.
  return NextResponse.redirect(url, 308)
}

export async function proxy(request: NextRequest) {
  const merged = await maybeMergedToolRedirect(request)
  if (merged) return merged
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
