/**
 * Phase 8 QA — 404 sweep across the catalog.
 *
 * Samples N URLs from each route type, HEAD-requests each one against
 * production, and reports anything not returning 200. Writes results
 * to logs/qa-404-<date>.tsv for the build-log.
 *
 * USAGE:
 *   npm run qa:404:dry          # list URLs that would be tested
 *   npm run qa:404               # actually fetch
 *   npm run qa:404 -- --full     # test EVERY URL (slower, but exhaustive)
 *
 * Default sample size: 30 per type. Full mode: every URL we can enumerate.
 */
export {}

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

const SITE = process.env.QA_SITE_URL || 'https://rightaichoice.com'
const CONCURRENCY = 8

type UrlRow = { url: string; type: string }

async function gatherUrls(full: boolean): Promise<UrlRow[]> {
  const supabase = getAdminClient()
  const out: UrlRow[] = []
  const cap = full ? Infinity : 30

  const { data: tools } = await supabase
    .from('tools')
    .select('slug')
    .eq('is_published', true)
    .limit(full ? 5000 : cap)
  for (const t of (tools as { slug: string }[]) ?? []) {
    out.push({ url: `${SITE}/tools/${t.slug}`, type: 'tool' })
    out.push({ url: `${SITE}/tools/${t.slug}/alternatives`, type: 'alts' })
    out.push({ url: `${SITE}/tools/${t.slug}/report`, type: 'report' })
  }

  const { data: comparisons } = await supabase
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
    .limit(full ? 5000 : cap)
  for (const c of (comparisons as { slug: string }[]) ?? []) {
    out.push({ url: `${SITE}/compare/${c.slug}`, type: 'compare' })
  }

  const { data: cats } = await supabase
    .from('categories')
    .select('slug')
    .limit(full ? 200 : cap)
  for (const c of (cats as { slug: string }[]) ?? []) {
    out.push({ url: `${SITE}/categories/${c.slug}`, type: 'category' })
  }

  const STATIC_ROUTES = [
    '/',
    '/tools',
    '/compare',
    '/categories',
    '/best',
    '/stacks',
    '/for',
    '/blog',
    '/recommend',
    '/ai-chat',
    '/viability',
    '/viability/at-risk',
    '/viability/safe-bets',
    '/methodology',
    '/team',
    '/about',
    '/privacy',
    '/terms',
    '/unsubscribe',
    '/embed',
    '/embed/tool-of-day',
    '/sitemap.xml',
    '/sitemap-index.xml',
    '/tools/sitemap.xml',
    '/compare/sitemap.xml',
    '/categories/sitemap.xml',
    '/best/sitemap.xml',
    '/stacks/sitemap.xml',
    '/for/sitemap.xml',
    '/blog/sitemap.xml',
    '/robots.txt',
  ]
  for (const path of STATIC_ROUTES) {
    out.push({ url: `${SITE}${path}`, type: 'static' })
  }

  return out
}

async function checkOne(url: string): Promise<number | null> {
  try {
    // Some hosts gate HEAD; use GET with no body fetch when HEAD fails.
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'RightAIChoice-QA-Sweep/1.0' },
      redirect: 'follow',
    })
    return res.status
  } catch {
    return null
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const dry = argv.includes('--dry')
  const full = argv.includes('--full')

  const urls = await gatherUrls(full)
  console.log(`[qa] checking ${urls.length} URLs against ${SITE}`)

  if (dry) {
    urls.slice(0, 30).forEach(({ url, type }) => console.log(`  [${type}] ${url}`))
    if (urls.length > 30) console.log(`  … and ${urls.length - 30} more`)
    return
  }

  const results: Array<{ url: string; type: string; status: number | null }> = []
  let done = 0
  const queue = [...urls]
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) return
      const status = await checkOne(item.url)
      results.push({ ...item, status })
      done++
      if (done % 25 === 0) console.log(`  [qa] ${done}/${urls.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const bad = results.filter((r) => r.status !== 200)
  console.log(`\n✓ ${results.length - bad.length} OK · ✗ ${bad.length} non-200`)

  const logsDir = join(process.cwd(), 'logs')
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const tsv =
    'status\ttype\turl\n' +
    results
      .sort((a, b) => (a.status ?? 0) - (b.status ?? 0))
      .map((r) => `${r.status ?? 'ERR'}\t${r.type}\t${r.url}`)
      .join('\n')
  const path = join(logsDir, `qa-404-${date}.tsv`)
  writeFileSync(path, tsv, 'utf-8')
  console.log(`✓ Wrote ${path}`)

  if (bad.length > 0) {
    console.log(`\nNon-200s:`)
    bad.slice(0, 50).forEach((r) => console.log(`  ${r.status ?? 'ERR'}  [${r.type}] ${r.url}`))
    if (bad.length > 50) console.log(`  … and ${bad.length - 50} more`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
