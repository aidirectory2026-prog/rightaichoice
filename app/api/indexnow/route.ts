import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { submitToIndexNow } from '@/lib/indexnow'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { BEST_PAGES } from '@/lib/data/best-pages'
import { STACKS } from '@/lib/data/stacks'
import { ROLE_PAGES } from '@/lib/data/role-pages'
import { getAllPosts } from '@/lib/data/blog'

const BASE = 'https://rightaichoice.com'

/**
 * POST /api/indexnow — Submit all site URLs to IndexNow.
 * Protected by CRON_SECRET. Called from GitHub Actions weekly or manually.
 * Uses admin client (no cookies) since this runs outside a browser context.
 */
export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const db = getAdminClient()
  const urls: string[] = []

  // Static pages
  urls.push(
    BASE,
    `${BASE}/tools`,
    `${BASE}/categories`,
    `${BASE}/best`,
    `${BASE}/stacks`,
    `${BASE}/viability`,
    `${BASE}/viability/at-risk`,
    `${BASE}/viability/safe-bets`,
    `${BASE}/plan`,
    `${BASE}/compare`,
  )

  // Tool pages
  const { data: tools } = await db
    .from('tools')
    .select('slug')
    .eq('is_published', true)
  if (tools) {
    urls.push(...(tools as { slug: string }[]).map((t) => `${BASE}/tools/${t.slug}`))
  }

  // Editorial comparison pages only — user-saved comparisons stay private
  const { data: comparisons } = await db
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
  if (comparisons) {
    urls.push(...(comparisons as { slug: string }[]).map((c) => `${BASE}/compare/${c.slug}`))
  }

  // Question pages
  const { data: questions } = await db
    .from('questions')
    .select('id')
    .eq('is_flagged', false)
  if (questions) {
    urls.push(...(questions as { id: string }[]).map((q) => `${BASE}/questions/${q.id}`))
  }

  // Category pages
  const { data: categories } = await db
    .from('categories')
    .select('slug')
  if (categories) {
    urls.push(...(categories as { slug: string }[]).map((c) => `${BASE}/categories/${c.slug}`))
  }

  // Best-of pages (static data)
  urls.push(...BEST_PAGES.map((p) => `${BASE}/best/${p.slug}`))

  // Stack pages (static data)
  urls.push(...STACKS.map((s) => `${BASE}/stacks/${s.slug}`))

  // Role pages (static data)
  urls.push(`${BASE}/for`)
  urls.push(...ROLE_PAGES.map((r) => `${BASE}/for/${r.slug}`))

  // Blog post URLs (file-based)
  urls.push(`${BASE}/blog`)
  urls.push(...getAllPosts().map((p) => `${BASE}/blog/${p.slug}`))

  // IndexNow accepts max 10,000 URLs per request — batch if needed
  const batchSize = 10000
  let submitted = 0
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    await submitToIndexNow(batch)
    submitted += batch.length
  }

  return NextResponse.json({
    success: true,
    submitted,
    message: `Submitted ${submitted} URLs to IndexNow`,
  })
}
