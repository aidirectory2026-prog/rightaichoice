// Phase 11 (Mixpanel upgrade) — global admin search endpoint.
// Powers the header search box: find a user (email/name/distinct_id), a person
// by what they searched/typed, or an event by name. Admin-gated + service-role.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { checkAdmin } from '@/lib/admin/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Gate: must be a signed-in admin (the /admin pages gate at the layout, but
  // an API route needs its own check). 401 vs 403 preserved via gate.status.
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ results: [] }, { status: gate.status })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('insights_search_everything', { p_q: q, p_limit: 25 })
  if (error) return NextResponse.json({ results: [], error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
