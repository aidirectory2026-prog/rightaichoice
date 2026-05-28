/**
 * Phase 9 Day-4 (2026-05-29) — Wayback Machine archival of canonical pages.
 *
 * Pings web.archive.org's "Save Page Now" endpoint for our structural URLs
 * (homepage, sitemap, llms.txt + llms-full.txt, 15 category indexes). Why
 * bother?
 *
 *   1. AI assistants increasingly cite archived URLs as the "stable" source
 *      when canonical pages move. A fresh Wayback snapshot makes the current
 *      canonical state the reference point.
 *   2. archive.org is itself a crawlable corpus — fresh snapshots get picked
 *      up by Google's archived-content discovery and by some independent AI
 *      training pipelines.
 *   3. Free baseline audit trail. If a competitor later mirrors our content,
 *      the timestamped Wayback record is proof of priority.
 *
 * Rate limit: ~15 req/min unauthenticated. We sleep 5s between requests to
 * stay well under it.
 *
 * USAGE:
 *   npm run wayback:save:dry        # preview the URL list
 *   npm run wayback:save            # actually trigger saves
 *
 * NOTE: each save can take 30-60s on the server side (Wayback fetches the
 * page, renders it, stores it). We don't await the full job — the POST
 * returning 200 means it's queued.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

const SITE = 'https://rightaichoice.com'
const SAVE_ENDPOINT = 'https://web.archive.org/save'
const SLEEP_MS = 5_000

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run') || args.includes('--dry')

async function structuralUrls(): Promise<string[]> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('categories').select('slug')
  if (error) throw new Error(`fetch categories: ${error.message}`)
  const catUrls = ((data as { slug: string }[]) ?? []).map(
    (c) => `${SITE}/categories/${c.slug}`,
  )
  return [
    `${SITE}/`,
    `${SITE}/tools`,
    `${SITE}/compare`,
    `${SITE}/plan`,
    `${SITE}/methodology`,
    `${SITE}/about`,
    `${SITE}/sitemap-index.xml`,
    `${SITE}/llms.txt`,
    `${SITE}/llms-full.txt`,
    `${SITE}/feed.xml`,
    ...catUrls,
  ]
}

async function saveOne(url: string): Promise<{ ok: boolean; status: number; note: string }> {
  // Wayback's Save Page Now: a simple GET hits the page and starts the
  // archival job. POST also works but GET is more permissive on their end.
  const target = `${SAVE_ENDPOINT}/${encodeURI(url)}`
  try {
    const res = await fetch(target, {
      method: 'GET',
      redirect: 'manual', // don't follow into the rendered archive HTML
      headers: { 'User-Agent': 'RightAIChoice/1.0 (+https://rightaichoice.com)' },
    })
    // 200, 302 (→ archived URL), or 429 (rate-limited but queued) all mean
    // "received". Anything else is suspicious.
    if (res.status === 429) return { ok: false, status: res.status, note: 'rate-limited' }
    if (res.status >= 200 && res.status < 400) return { ok: true, status: res.status, note: '' }
    return { ok: false, status: res.status, note: res.statusText }
  } catch (e) {
    return { ok: false, status: 0, note: (e as Error).message.slice(0, 100) }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const urls = await structuralUrls()
  console.log(`Pages to archive: ${urls.length}`)
  console.log(`Mode:             ${isDry ? 'DRY-RUN' : 'SUBMIT'}`)
  console.log('')

  if (isDry) {
    urls.forEach((u) => console.log(`  · ${u}`))
    console.log('')
    console.log(`Re-run with \`npm run wayback:save\` to actually queue (~${Math.ceil((urls.length * SLEEP_MS) / 60_000)} min wall-clock).`)
    return
  }

  let ok = 0
  let failed = 0
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const result = await saveOne(url)
    const tag = result.ok ? '✓' : '✗'
    const detail = result.note ? ` (${result.note})` : ''
    console.log(`  ${tag} [${i + 1}/${urls.length}] ${result.status}${detail}  ${url}`)
    if (result.ok) ok++
    else failed++
    if (i < urls.length - 1) await sleep(SLEEP_MS)
  }

  console.log('')
  console.log(`Done: ${ok} queued, ${failed} failed.`)
  console.log(`Snapshots typically appear in https://web.archive.org/web/*/rightaichoice.com within a few minutes.`)
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
