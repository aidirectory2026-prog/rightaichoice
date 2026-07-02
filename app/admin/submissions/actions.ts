'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { requireAdmin } from '@/lib/admin/require-admin'
import {
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
} from '@/lib/submissions/emails'
import { serverAnalytics } from '@/lib/mixpanel-server'

// Phase 14 — editorial decisions on vendor tool submissions. Approve creates
// the tools DRAFT row (is_published=false, submitted_by=vendor) and the
// onboard SOP takes it from there — this file never publishes anything.

const REJECT_REASONS = new Set([
  'not_ai_tool',
  'duplicate',
  'low_quality',
  'site_unreachable',
  'spam',
  'other',
])

type SubmissionRow = {
  id: string
  user_id: string
  name: string
  website_url: string
  tagline: string
  description: string
  pricing_type: string
  logo_url: string | null
  proposed_slug: string
  status: string
}

async function submitterEmail(userId: string): Promise<string | null> {
  try {
    const admin = getAdminClient()
    const { data } = await admin.auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch {
    return null
  }
}

export async function approveSubmission(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    const { userId: adminId } = await requireAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any

    const { data: subRaw } = await admin
      .from('tool_submissions')
      .select('id, user_id, name, website_url, tagline, description, pricing_type, logo_url, proposed_slug, status')
      .eq('id', id)
      .maybeSingle()
    const sub = subRaw as SubmissionRow | null
    if (!sub) return { error: 'Submission not found' }
    if (sub.status !== 'pending') return { error: 'Submission is not pending' }

    // Re-verify slug uniqueness at approval time; suffix on collision
    // (same shape as actions/tools.ts createTool).
    let slug = sub.proposed_slug
    for (let n = 2; n <= 10; n++) {
      const { data: clash } = await admin.from('tools').select('id').eq('slug', slug).maybeSingle()
      if (!clash) break
      slug = `${sub.proposed_slug}-${n}`
    }

    // Minimal DRAFT insert — mirrors lib/cron/ingest.ts: freshness columns
    // NULL (anti-starvation, SOP grabs it first), is_published=false
    // (DRAFT-until-green), submitted_by marks vendor provenance and drives
    // the tool_creator badge. No inline enrichment: the SOP's own steps
    // backfill features/categories/FAQs/etc. with retries.
    const { data: insertedRaw, error: insertError } = await admin
      .from('tools')
      .insert({
        name: sub.name,
        slug,
        tagline: sub.tagline,
        description: sub.description,
        website_url: sub.website_url,
        pricing_type: sub.pricing_type,
        logo_url: sub.logo_url,
        submitted_by: sub.user_id,
        last_verified_at: null,
        is_published: false,
      })
      .select('id')
      .single()
    if (insertError || !insertedRaw) return { error: insertError?.message ?? 'Insert failed' }
    const toolId = (insertedRaw as { id: string }).id

    const { error: updateError } = await admin
      .from('tool_submissions')
      .update({
        status: 'approved',
        tool_id: toolId,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
    if (updateError) return { error: updateError.message }

    // Best-effort side effects — the approval already succeeded.
    void serverAnalytics.toolSubmissionReviewed(sub.user_id, sub.id, 'approved')
    const email = await submitterEmail(sub.user_id)
    if (email) void sendSubmissionApprovedEmail(email, sub.name)

    revalidatePath('/admin/submissions')
    revalidatePath('/submit')
    return { ok: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function rejectSubmission(
  id: string,
  reason: string,
  note?: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    const { userId: adminId } = await requireAdmin()
    if (!REJECT_REASONS.has(reason)) return { error: 'Invalid rejection reason' }
    const trimmedNote = note?.trim().slice(0, 1000) || null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any

    const { data: subRaw } = await admin
      .from('tool_submissions')
      .select('id, user_id, name, status')
      .eq('id', id)
      .maybeSingle()
    const sub = subRaw as Pick<SubmissionRow, 'id' | 'user_id' | 'name' | 'status'> | null
    if (!sub) return { error: 'Submission not found' }
    if (sub.status !== 'pending') return { error: 'Submission is not pending' }

    const { error: updateError } = await admin
      .from('tool_submissions')
      .update({
        status: 'rejected',
        rejected_reason: reason,
        rejected_note: trimmedNote,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
    if (updateError) return { error: updateError.message }

    void serverAnalytics.toolSubmissionReviewed(sub.user_id, sub.id, 'rejected', reason)
    const email = await submitterEmail(sub.user_id)
    if (email) void sendSubmissionRejectedEmail(email, sub.name, reason, trimmedNote)

    revalidatePath('/admin/submissions')
    revalidatePath('/submit')
    return { ok: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
