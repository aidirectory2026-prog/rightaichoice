/**
 * Phase 9 Smart SEO (2026-05-30): push all editorial compares + the crawlable
 * /compare hub pages to IndexNow (Bing/Yandex). Run after the pagination fix so
 * the previously-"unknown" compares get announced to Bing immediately, rather
 * than waiting for organic crawl.
 *
 * USAGE: npm run indexnow:compares[:dry]
 * REQUIRED ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INDEXNOW key file
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { submitToIndexNow } from '../lib/indexnow'

const BASE = 'https://rightaichoice.com'
const PER_PAGE = 24
const isDry = process.argv.includes('--dry') || process.argv.includes('--dry-run')

async function main() {
  const db = getAdminClient()
  const { data, error } = await db
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
    .eq('noindex', false)
  if (error) throw new Error(error.message)

  const slugs = ((data as { slug: string }[]) ?? []).map((c) => c.slug)
  const hubPages = Math.max(1, Math.ceil(slugs.length / PER_PAGE))

  const urls = [
    `${BASE}/compare`,
    ...Array.from({ length: hubPages - 1 }, (_, i) => `${BASE}/compare?page=${i + 2}`),
    ...slugs.map((s) => `${BASE}/compare/${s}`),
  ]

  console.log(
    `[indexnow:compares] ${urls.length} URLs (${slugs.length} compares + ${hubPages} hub pages)`,
  )
  if (isDry) {
    console.log('[indexnow:compares] --dry — not submitting'); console.log(urls.slice(0, 5))
    return
  }
  await submitToIndexNow(urls)
  console.log('[indexnow:compares] submitted ✓')
}

main().catch((e) => {
  console.error('[indexnow:compares] failed:', e)
  process.exit(1)
})
