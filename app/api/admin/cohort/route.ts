// Phase 11 (Mixpanel upgrade) — cohort engine API. Runs a condition tree via
// insights_cohort and manages saved cohorts (admin_saved_views). Admin-gated.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return null
  return user
}

// GET — list saved cohorts.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ views: [] }, { status: 403 })
  const db = getAdminClient()
  const { data } = await db
    .from('admin_saved_views')
    .select('id,name,payload,created_at')
    .eq('kind', 'cohort')
    .order('created_at', { ascending: false })
  return NextResponse.json({ views: data ?? [] })
}

// POST — { action: 'run' | 'save' | 'delete', ... }
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const db = getAdminClient()
  const body = await req.json().catch(() => ({}))
  const action = body.action ?? 'run'

  if (action === 'save') {
    if (!body.name || !body.payload) return NextResponse.json({ error: 'name + payload required' }, { status: 400 })
    await db.from('admin_saved_views').insert({ name: String(body.name).slice(0, 120), kind: 'cohort', payload: body.payload, created_by: user.id } as never)
    return NextResponse.json({ ok: true })
  }
  if (action === 'delete') {
    if (body.id) await db.from('admin_saved_views').delete().eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // run
  const days = Math.min(Math.max(Number(body.days ?? 30), 1), 365)
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('insights_cohort', {
    p_conditions: body.conditions ?? { op: 'and', conditions: [] },
    p_cutoff: cutoff,
    p_end: null,
    p_include_bots: !!body.includeBots,
    p_limit: 500,
  })
  if (error) return NextResponse.json({ results: [], error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
