'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  return supabase
}

type ActionMetadata = {
  baseline_position?: number | null
  baseline_impressions?: number | null
  baseline_clicks?: number | null
  baseline_ctr?: number | null
}

export async function acceptAction(formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  // Read the metadata baseline values written by triage-gsc so we can
  // freeze them into the dedicated columns.
  const { data: row, error: readErr } = await supabase
    .from('weekly_loop_actions')
    .select('metadata, status')
    .eq('id', id)
    .single()
  if (readErr || !row) throw new Error(readErr?.message ?? 'not found')
  const r = row as { metadata: ActionMetadata | null; status: string }
  if (r.status !== 'proposed') throw new Error(`Cannot accept from status='${r.status}'`)

  const m = r.metadata ?? {}
  const { error } = await supabase
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
  const supabase = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  const { error } = await supabase
    .from('weekly_loop_actions')
    .update({ status: 'rejected' } as never)
    .eq('id', id)
    .in('status', ['proposed', 'accepted'])
  if (error) throw new Error(error.message)

  revalidatePath('/admin/seo-pulse')
}

export async function markExecuted(formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id required')

  const { error } = await supabase
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
