import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { submitToIndexNow } from '@/lib/indexnow'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

const BASE = 'https://rightaichoice.com'
const WINDOW_DAYS = 7

/**
 * POST /api/cron/indexnow-recent — Delta IndexNow ping.
 *
 * Pings only URLs whose underlying row was created in the last WINDOW_DAYS.
 * Complements the weekly full-sitemap ping at /api/indexnow — this one runs
 * daily so newly seeded tools and editorial comparisons are pushed to Bing/
 * Yandex within a day, not a week. IndexNow accepts duplicate submissions
 * across days, so the 7-day overlap with the weekly run is harmless.
 *
 * Includes:
 *   - Newly published tools (tools.is_published = true)
 *   - Newly seeded editorial comparisons (tool_comparisons.is_editorial = true)
 *
 * Excluded by design:
 *   - User-saved tool_comparisons (is_editorial = false) — private/transient
 *   - Tool *updates* (handled by the weekly full ping)
 */
export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const db = getAdminClient()
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const urls: string[] = []

  const { data: tools } = await db
    .from('tools')
    .select('slug')
    .eq('is_published', true)
    .gte('created_at', cutoff)
  if (tools) {
    urls.push(...(tools as { slug: string }[]).map((t) => `${BASE}/tools/${t.slug}`))
  }

  const { data: comparisons } = await db
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
    .gte('published_at', cutoff)
  if (comparisons) {
    urls.push(
      ...(comparisons as { slug: string }[]).map((c) => `${BASE}/compare/${c.slug}`),
    )
  }

  if (urls.length === 0) {
    return NextResponse.json({
      success: true,
      submitted: 0,
      message: `No tools or editorial comparisons created in the last ${WINDOW_DAYS} days`,
    })
  }

  await submitToIndexNow(urls)

  return NextResponse.json({
    success: true,
    submitted: urls.length,
    window_days: WINDOW_DAYS,
    message: `Submitted ${urls.length} recent URLs to IndexNow`,
  })
}
