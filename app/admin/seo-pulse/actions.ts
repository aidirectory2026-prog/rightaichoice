'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { approveTitleOverride } from '@/app/admin/tier1-review/actions'

// Phase 9 Day-4 Part 2 (2026-05-29) — Server actions for the SEO Pulse
// weekly-loop review page.
//
// Lifecycle:
//   proposed → accepted (baseline frozen) → executed → measured
//   proposed → rejected
//
// "Freezing the baseline" matters: outcome_* columns are filled 4 weeks
// after execution by a future job (/seo-impact). Lift = outcome - baseline,
// so the baseline must be locked at the moment we commit to the action, not
// re-read from a moving GSC window.
//
// 2026-06-03 fix: writes go through getAdminClient() (service role). The page
// renders for any admin (authenticated_read SELECT policy), but weekly_loop_actions
// only grants writes to service_role (service_role_full_access ALL policy). The
// old cookie-client UPDATEs matched 0 rows under RLS with NO error — so Accept/
// Reject/Mark-executed silently no-op'd and the buttons looked dead. requireAdmin()
// (cookie client) still gates authorization; the mutation uses the admin client.

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Admin only')
}

type ActionMetadata = {
  baseline_position?: number | null
  baseline_impressions?: number | null
  baseline_clicks?: number | null
  baseline_ctr?: number | null
}

export async function acceptAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // Read the metadata baseline values written by triage-gsc so we can
  // freeze them into the dedicated columns.
  const { data: row, error: readErr } = await admin
    .from('weekly_loop_actions')
    .select('metadata, status')
    .eq('id', id)
    .single()
  if (readErr || !row) throw new Error(readErr?.message ?? 'not found')
  const r = row as { metadata: ActionMetadata | null; status: string }
  if (r.status !== 'proposed') throw new Error(`Cannot accept from status='${r.status}'`)

  const m = r.metadata ?? {}
  const { error } = await admin
    .from('weekly_loop_actions')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      baseline_position: m.baseline_position ?? null,
      baseline_impressions: m.baseline_impressions ?? null,
      baseline_clicks: m.baseline_clicks ?? null,
      baseline_ctr: m.baseline_ctr ?? null,
    } as never)
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/seo-pulse')
}

export async function rejectAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { error } = await admin
    .from('weekly_loop_actions')
    .update({ status: 'rejected' } as never)
    .eq('id', id)
    .in('status', ['proposed', 'accepted'])
  if (error) throw new Error(error.message)

  revalidatePath('/admin/seo-pulse')
}

// 2026-06-28 — the REAL "apply" for a title_rewrite action. The old Accept/
// Mark-executed only flipped workflow status; they never changed a live title,
// so the button looked dead from the owner's seat. This writes a real
// title_override (reusing the canonical tier1 apply: soft-revert + insert +
// GSC baseline capture + recrawl signal) AND marks the weekly action executed.
export async function applyTitleAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id) throw new Error('id required')
  if (title.length < 10 || title.length > 80) {
    throw new Error('Title must be 10–80 chars (include the " | RightAIChoice" suffix)')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { data: row, error: readErr } = await admin
    .from('weekly_loop_actions')
    .select('page, action_type')
    .eq('id', id)
    .single()
  if (readErr || !row) throw new Error(readErr?.message ?? 'action not found')
  const r = row as { page: string; action_type: string }
  if (r.action_type !== 'title_rewrite') throw new Error('Not a title_rewrite action')

  // GSC stores a full URL; title_overrides keys on the path.
  const pagePath = r.page.replace(/^https?:\/\/[^/]+/, '')

  const res = await approveTitleOverride({
    pagePath,
    title,
    bucket: '1A',
    notes: `Applied from SEO Pulse weekly action ${id}`,
  })
  if (res.error) throw new Error(res.error)

  await admin
    .from('weekly_loop_actions')
    .update({ status: 'executed', executed_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/admin/seo-pulse')
}

export async function markExecuted(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { error } = await admin
    .from('weekly_loop_actions')
    .update({
      status: 'executed',
      executed_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .eq('status', 'accepted')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/seo-pulse')
}
