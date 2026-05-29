'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
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

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Not authorized')
  return { user }
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
    const { user } = await requireAdmin()

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
      approved_by: user.id,
      notes: args.notes ?? null,
    })

    if (error) return { error: error.message }

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
