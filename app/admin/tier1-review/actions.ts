'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { requireAdmin } from '@/lib/admin/require-admin'
import { bumpFreshness, type FreshnessPageType } from '@/lib/seo/freshness'
import { submitToIndexNow } from '@/lib/indexnow'

const BASE_URL = 'https://rightaichoice.com'

function pageTypeFromPath(path: string): FreshnessPageType {
  if (path.startsWith('/compare/')) return 'compare'
  if (path.startsWith('/blog/')) return 'blog'
  if (path.startsWith('/categories/')) return 'category'
  if (path.startsWith('/best/')) return 'best'
  if (path.startsWith('/for/')) return 'role'
  if (path.startsWith('/stacks/')) return 'stack'
  return 'tool'
}

/**
 * After a title change goes live, the page is invisible to Google until it
 * recrawls. Bump pages_freshness (so the sitemap <lastmod> updates → recrawl
 * signal) and ping IndexNow directly. Best-effort: a failure here must never
 * block the approval, which already succeeded.
 */
async function signalRecrawl(path: string, event: string): Promise<void> {
  try {
    await bumpFreshness(path, {
      pageType: pageTypeFromPath(path),
      source: 'admin_manual',
      event,
      reason: 'tier1 title rewrite',
    })
  } catch (e) {
    console.warn(`[tier1] bumpFreshness(${path}) failed:`, (e as Error).message)
  }
  try {
    await submitToIndexNow(`${BASE_URL}${path}`)
  } catch (e) {
    console.warn(`[tier1] IndexNow ping(${path}) failed:`, (e as Error).message)
  }
}

/**
 * Freeze the page's current GSC metrics (latest 28d snapshot) onto the active
 * title_overrides row, so /seo-impact can compute lift 28 days later. Captured
 * at approval = pre-recrawl, i.e. the title's old performance. Best-effort.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function captureBaseline(admin: any, path: string): Promise<void> {
  try {
    const { data: snap } = await admin
      .from('gsc_snapshots')
      .select('snapshot_date')
      .eq('scope', '28d')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sd = (snap as { snapshot_date?: string } | null)?.snapshot_date
    if (!sd) return
    const { data: m } = await admin.rpc('gsc_page_metrics', {
      p_path: path,
      p_snapshot_date: sd,
    })
    const row = (Array.isArray(m) ? m[0] : m) as
      | { wpos: number | null; impressions: number; clicks: number; ctr: number }
      | null
    if (!row) return
    await admin
      .from('title_overrides')
      .update({
        baseline_captured_at: new Date().toISOString(),
        baseline_snapshot_date: sd,
        baseline_position: row.wpos,
        baseline_impressions: row.impressions,
        baseline_clicks: row.clicks,
        baseline_ctr: row.ctr,
      })
      .eq('page_path', path)
      .is('reverted_at', null)
  } catch (e) {
    console.warn(`[tier1] captureBaseline(${path}) failed:`, (e as Error).message)
  }
}


type ApproveArgs = {
  pagePath: string
  title: string
  bucket: '1A' | '1B' | '1C'
  notes?: string
}

export async function approveTitleOverride(
  args: ApproveArgs,
): Promise<{ ok?: true; error?: string }> {
  try {
    const { userId } = await requireAdmin()

    if (!args.pagePath.startsWith('/') || args.pagePath.length > 200) {
      return { error: 'Invalid pagePath' }
    }
    const title = args.title.trim()
    if (title.length < 10 || title.length > 80) {
      return { error: 'Title must be 10–80 chars' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any

    // Soft-revert the existing active override for this path so the
    // unique partial index doesn't collide. Preserves the audit trail.
    await admin
      .from('title_overrides')
      .update({ reverted_at: new Date().toISOString() })
      .eq('page_path', args.pagePath)
      .is('reverted_at', null)

    const { error } = await admin.from('title_overrides').insert({
      page_path: args.pagePath,
      override_title: title,
      source_bucket: args.bucket,
      approved_by: userId,
      notes: args.notes ?? null,
    })

    if (error) return { error: error.message }

    // Freeze the pre-recrawl GSC baseline so /seo-impact can measure lift in
    // 28 days. Best-effort — never block the approval.
    await captureBaseline(admin, args.pagePath)

    revalidatePath(args.pagePath)
    revalidatePath('/admin/tier1-review')
    await signalRecrawl(args.pagePath, 'tier1_title_approved')
    return { ok: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function revertTitleOverride(args: {
  pagePath: string
}): Promise<{ ok?: true; error?: string }> {
  try {
    await requireAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any
    const { error } = await admin
      .from('title_overrides')
      .update({ reverted_at: new Date().toISOString() })
      .eq('page_path', args.pagePath)
      .is('reverted_at', null)

    if (error) return { error: error.message }
    revalidatePath(args.pagePath)
    revalidatePath('/admin/tier1-review')
    await signalRecrawl(args.pagePath, 'tier1_title_reverted')
    return { ok: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
