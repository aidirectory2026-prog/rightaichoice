// Phase 14b Wave 3 — saved REPORTS. A report is any insights page + its full
// filter/query state, saved by name in admin_saved_views (kind='report',
// payload={name, path, query}). URL-state-everywhere makes this trivially
// general: reloading a report is just navigating to path + '?' + query.
// Admin-gated like the cohort API.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { checkAdmin } from '@/lib/admin/require-admin'

export const dynamic = 'force-dynamic'

// GET — list saved reports.
export async function GET() {
  if (!(await checkAdmin()).ok) return NextResponse.json({ views: [] }, { status: 403 })
  const db = getAdminClient()
  const { data } = await db
    .from('admin_saved_views')
    .select('id,name,payload,created_at')
    .eq('kind', 'report')
    .order('created_at', { ascending: false })
  return NextResponse.json({ views: data ?? [] })
}

// POST — { action: 'save' | 'delete', ... }
export async function POST(req: NextRequest) {
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const db = getAdminClient()
  const body = await req.json().catch(() => ({}))

  if (body.action === 'save') {
    const name = String(body.name ?? '').trim().slice(0, 120)
    const path = String(body.path ?? '')
    const query = String(body.query ?? '').slice(0, 2000)
    // Only admin pages are addressable — a report is a bookmark, not a redirect.
    if (!name || !path.startsWith('/admin')) {
      return NextResponse.json({ error: 'name + /admin path required' }, { status: 400 })
    }
    await db
      .from('admin_saved_views')
      .insert({ name, kind: 'report', payload: { name, path, query }, created_by: gate.userId } as never)
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'delete') {
    if (body.id) await db.from('admin_saved_views').delete().eq('id', body.id).eq('kind', 'report')
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
