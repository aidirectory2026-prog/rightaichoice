// Phase 8.g.9 (2026-05-21) — PATCH endpoint for editing KPI goal values
// from /admin/insights/goals. Admin-gated via the same pattern as
// /api/admin/export.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { checkAdmin } from '@/lib/admin/require-admin'

export async function PATCH(req: NextRequest) {
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  let body: { kpi_key?: string; goal_value?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }
  if (!body.kpi_key || typeof body.goal_value !== 'number' || body.goal_value < 0) {
    return NextResponse.json({ error: 'kpi_key (string) + goal_value (number ≥0) required' }, { status: 400 })
  }

  const db = getAdminClient()
  // insights_goals isn't in the generated Supabase types yet (added in
  // migration 099 after the last type-gen pass). Cast around it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('insights_goals')
    .update({ goal_value: body.goal_value, updated_at: new Date().toISOString(), updated_by: gate.userId ?? null })
    .eq('kpi_key', body.kpi_key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
