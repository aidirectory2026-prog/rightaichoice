// Phase 11 (Mixpanel upgrade) — cohort engine API. Runs a condition tree via
// insights_cohort and manages saved cohorts (admin_saved_views). Admin-gated.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { checkAdmin } from '@/lib/admin/require-admin'

export const dynamic = 'force-dynamic'

// Wave 5 (mig 188) — validate condition shapes before they reach the RPC.
// The RPC is defensive too (charset checks, field allowlists); this keeps
// garbage payloads out of saved views and returns a clear 400 instead.
const COND_TYPES = new Set(['did_event', 'not_event', 'sequence', 'property', 'geo', 'device'])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validConditions(payload: any): boolean {
  const list = payload?.conditions
  if (!Array.isArray(list) || list.length > 12) return false
  return list.every((c) => {
    if (!c || typeof c !== 'object' || !COND_TYPES.has(c.type)) return false
    if (c.min_count !== undefined && !(Number.isInteger(c.min_count) && c.min_count >= 1 && c.min_count <= 1000)) return false
    if (c.where !== undefined) {
      if (typeof c.where?.k !== 'string' || !/^[a-z0-9_]{1,64}$/.test(c.where.k)) return false
      if (typeof c.where?.v !== 'string' || c.where.v.length > 200) return false
    }
    if (c.type === 'geo' && !['country', 'city', 'region'].includes(c.field)) return false
    if (c.type === 'device' && !['desktop', 'mobile', 'tablet', 'unknown'].includes(c.value)) return false
    return true
  })
}

// GET — list saved cohorts.
export async function GET() {
  if (!(await checkAdmin()).ok) return NextResponse.json({ views: [] }, { status: 403 })
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
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const db = getAdminClient()
  const body = await req.json().catch(() => ({}))
  const action = body.action ?? 'run'

  if (action === 'save') {
    if (!body.name || !body.payload) return NextResponse.json({ error: 'name + payload required' }, { status: 400 })
    await db.from('admin_saved_views').insert({ name: String(body.name).slice(0, 120), kind: 'cohort', payload: body.payload, created_by: gate.userId } as never)
    return NextResponse.json({ ok: true })
  }
  if (action === 'delete') {
    if (body.id) await db.from('admin_saved_views').delete().eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // run
  if (body.conditions && !validConditions(body.conditions)) {
    return NextResponse.json({ results: [], error: 'invalid condition shape' }, { status: 400 })
  }
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
