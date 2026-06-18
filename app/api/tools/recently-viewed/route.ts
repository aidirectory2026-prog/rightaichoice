import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Cowork QA (homepage perf): resolves the client-held `rac_recent` slugs into
 * tool cards for the "Recently viewed" rail. Moving this OUT of a server
 * component (which read cookies() and forced the whole homepage to render
 * dynamic — no edge cache, ~1.1s TTFB) lets the homepage be statically cached
 * again; the rail hydrates client-side from this endpoint instead.
 *
 * Public tool data only, keyed on the explicit ?slugs= param (no cookies, no
 * auth) — so this route is the only per-request work, not the whole page.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('slugs') ?? ''
  const slugs = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
    .slice(0, 10)

  if (slugs.length === 0) {
    return NextResponse.json({ tools: [] }, { headers: { 'cache-control': 'private, max-age=30' } })
  }

  type Row = { id: string; name: string; slug: string; tagline: string | null; logo_url: string | null }
  const admin = getAdminClient()
  const { data } = await admin
    .from('tools')
    .select('id, name, slug, tagline, logo_url')
    .in('slug', slugs)
    .eq('is_published', true)

  // Return in the order the slugs were given (most-recent-first from the cookie).
  const rows = (data ?? []) as Row[]
  const bySlug = new Map(rows.map((t) => [t.slug, t]))
  const tools = slugs.map((s) => bySlug.get(s)).filter(Boolean)

  return NextResponse.json({ tools }, { headers: { 'cache-control': 'private, max-age=30' } })
}
