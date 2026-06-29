'use server'

// Phase 13 Social — admin approval-queue actions. The brain only ever writes
// DRAFTs; a human moves them forward here. Approving a post sets status='approved'
// (the publish cron then posts it at its scheduled time). Nothing posts from here.

import { revalidatePath } from 'next/cache'
import { checkAdmin } from '@/lib/admin/require-admin'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { platformFit, voiceGate } from '@/lib/social/sops'
import type { DraftProposal, Platform, PostKind } from '@/lib/social/types'

type ActionResult = { ok?: true; error?: string }

async function gate(): Promise<{ db: ReturnType<typeof getAdminClient> } | { error: string }> {
  const g = await checkAdmin()
  if (!g.ok) return { error: g.status === 401 ? 'Not authenticated' : 'Admin only' }
  return { db: getAdminClient() }
}

async function setStatus(id: string, from: string[], to: string, extra: Record<string, unknown> = {}): Promise<ActionResult> {
  const g = await gate()
  if ('error' in g) return { error: g.error }
  // Read current status so we only allow legal transitions.
  const cur = (await g.db.from('social_posts').select('status').eq('id', id).single()) as {
    data: { status: string } | null
  }
  if (!cur.data) return { error: 'Post not found' }
  if (!from.includes(cur.data.status)) return { error: `Cannot do that from "${cur.data.status}"` }

  const upd = (await g.db
    .from('social_posts')
    .update({ status: to, updated_at: new Date().toISOString(), ...extra } as never)
    .eq('id', id)) as { error: { message: string } | null }
  if (upd.error) return { error: upd.error.message }
  revalidatePath('/admin/social')
  return { ok: true }
}

/** Approve a draft → ready for the publish cron to post at its scheduled time. */
export async function approvePost(id: string): Promise<ActionResult> {
  return setStatus(id, ['draft'], 'approved')
}

/** Send an approved post back to draft (un-approve before it posts). */
export async function unapprovePost(id: string): Promise<ActionResult> {
  return setStatus(id, ['approved', 'scheduled'], 'draft')
}

/** Reject/cancel a draft or approved post (never auto-deletes; keeps the audit row). */
export async function cancelPost(id: string): Promise<ActionResult> {
  return setStatus(id, ['draft', 'approved', 'scheduled', 'failed'], 'cancelled')
}

/** Reschedule (datetime-local string from the form, interpreted as local → ISO). */
export async function reschedulePost(id: string, whenISO: string): Promise<ActionResult> {
  if (!whenISO) return { error: 'Pick a time' }
  const d = new Date(whenISO)
  if (Number.isNaN(d.getTime())) return { error: 'Invalid time' }
  if (d.getTime() < Date.now() - 60_000) return { error: 'Time is in the past' }
  return setStatus(id, ['draft', 'approved', 'scheduled'], (await currentStatus(id)) ?? 'draft', {
    scheduled_at: d.toISOString(),
  })
}

async function currentStatus(id: string): Promise<string | null> {
  const db = getAdminClient()
  const r = (await db.from('social_posts').select('status').eq('id', id).single()) as {
    data: { status: string } | null
  }
  return r.data?.status ?? null
}

/** Edit copy + hashtags on a draft (re-runs the voice + platform-fit gate). */
export async function editPost(
  id: string,
  copy: string,
  hashtagsRaw: string,
): Promise<ActionResult> {
  const g = await gate()
  if ('error' in g) return { error: g.error }
  const trimmed = copy.trim()
  if (!trimmed) return { error: 'Copy cannot be empty' }
  const hashtags = hashtagsRaw
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`))

  const cur = (await g.db
    .from('social_posts')
    .select('platform, kind, link_url, graphic_template, status')
    .eq('id', id)
    .single()) as {
    data: { platform: Platform; kind: PostKind; link_url: string | null; graphic_template: string | null; status: string } | null
  }
  if (!cur.data) return { error: 'Post not found' }
  if (cur.data.status !== 'draft') return { error: 'Only drafts can be edited' }

  // Re-validate the edited content against the same SOP gates the brain used.
  const probe: DraftProposal = {
    platform: cur.data.platform,
    kind: cur.data.kind,
    copy: trimmed,
    hashtags,
    link_url: cur.data.link_url ?? undefined,
    graphic_template: cur.data.graphic_template ?? undefined,
    graphic_data: {},
    source_refs: [{ title: 'x', url: 'https://x' }], // sourcing already validated at draft time
    content_hash: 'edit',
    brain_meta: {},
  }
  const v = voiceGate(trimmed)
  const f = platformFit(probe)
  const reasons = [...v.reasons, ...f.reasons]
  if (reasons.length) return { error: reasons.join('; ') }

  const upd = (await g.db
    .from('social_posts')
    .update({ copy: trimmed, hashtags, updated_at: new Date().toISOString() } as never)
    .eq('id', id)) as { error: { message: string } | null }
  if (upd.error) return { error: upd.error.message }
  revalidatePath('/admin/social')
  return { ok: true }
}
