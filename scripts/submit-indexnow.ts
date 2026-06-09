/**
 * Phase 7B.seo (2026-05-13): IndexNow submission for Bing/Yandex.
 *
 * Pings IndexNow with all editorial /compare/[slug] URLs (and any
 * other URL types passed via --include flags). Bing indexes 10× faster
 * for new sites than Google and powers Microsoft Copilot / ChatGPT
 * search — meaningful share of AI-search traffic. Google does NOT
 * support IndexNow.
 *
 * Key file lives at /a8a235f29e1a4efcb9bc4e3735b89786.txt (root of the
 * site). IndexNow validates we own the domain by hitting that URL
 * before accepting our submission.
 *
 * USAGE:
 *   npm run indexnow:dry                   # list URLs that would be submitted
 *   npm run indexnow:submit                # submit /compare URLs
 *   npm run indexnow:submit -- --tools     # also include /tools URLs
 *   npm run indexnow:submit -- --all       # everything (compare + tools + categories + best + alternatives)
 *
 * COST: free. Quota: 10,000 URLs per request, no documented daily cap.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

const INDEXNOW_HOST = 'https://api.indexnow.org/indexnow'
const SITE = 'rightaichoice.com'
// Re-using the pre-existing key from lib/indexnow.ts — that key file
// has been live + verified for weeks via the /api/cron/indexnow-recent
// daily cron, so IndexNow accepts our submissions immediately. The
// new key generated 2026-05-13 is left in /public/ for redundancy but
// not used as the active key.
const KEY = '1ddd347878cead47f293292da0707a19'
const KEY_LOCATION = `https://${SITE}/${KEY}.txt`
const BATCH_CAP = 10_000 // IndexNow per-request URL limit

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run')
const isSubmit = args.includes('--submit')
const includeTools = args.includes('--tools') || args.includes('--all')
const includeAll = args.includes('--all')

if (!isDry && !isSubmit) {
  console.error('Pass --dry-run or --submit')
  process.exit(1)
}

async function fetchAllPages<T>(
  query: () => ReturnType<ReturnType<typeof getAdminClient>['from']>
): Promise<T[]> {
  // Lightweight pagination wrapper for arbitrary supabase chains.
  const all: T[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const q = query() as any
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

async function fetchEditorialCompareSlugs(): Promise<string[]> {
  const supa = getAdminClient()
  const slugs: string[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tool_comparisons')
      .select('slug')
      .eq('is_editorial', true)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    slugs.push(...rows.map((r) => r.slug))
    if (rows.length < PAGE) break
  }
  return slugs
}

async function fetchPublishedToolSlugs(): Promise<string[]> {
  const supa = getAdminClient()
  const slugs: string[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select('slug')
      .eq('is_published', true)
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    slugs.push(...rows.map((r) => r.slug))
    if (rows.length < PAGE) break
  }
  return slugs
}

async function fetchCategorySlugs(): Promise<string[]> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('categories').select('slug').range(0, 9999)
  if (error) throw error
  return ((data ?? []) as Array<{ slug: string }>).map((r) => r.slug)
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

async function main() {
  const compareSlugs = await fetchEditorialCompareSlugs()
  const compareUrls = compareSlugs.map((s) => `https://${SITE}/compare/${s}`)
  const urlList: string[] = [...compareUrls]

  if (includeTools) {
    const toolSlugs = await fetchPublishedToolSlugs()
    urlList.push(...toolSlugs.map((s) => `https://${SITE}/tools/${s}`))
    urlList.push(...toolSlugs.map((s) => `https://${SITE}/tools/${s}/alternatives`))
  }
  if (includeAll) {
    const catSlugs = await fetchCategorySlugs()
    urlList.push(...catSlugs.map((s) => `https://${SITE}/categories/${s}`))
    // Top-level marketing routes
    urlList.push(`https://${SITE}/`, `https://${SITE}/tools`, `https://${SITE}/compare`, `https://${SITE}/methodology`)
  }

  // Dedup
  const unique = Array.from(new Set(urlList))
  console.log(`Site:           ${SITE}`)
  console.log(`Key file:       ${KEY_LOCATION}`)
  console.log(`Compare URLs:   ${compareUrls.length}`)
  if (includeTools) console.log(`+ tool URLs (incl. /alternatives subroutes)`)
  if (includeAll) console.log(`+ category URLs + top-level routes`)
  console.log(`Total unique:   ${unique.length}`)
  console.log(`Mode:           ${isDry ? 'DRY-RUN' : 'SUBMIT'}`)
  console.log('')

  if (isDry) {
    console.log('Sample URLs (first 10):')
    for (const u of unique.slice(0, 10)) console.log(`  · ${u}`)
    console.log('')
    console.log(`Re-run with \`npm run indexnow:submit${includeTools ? ' -- --tools' : ''}${includeAll ? ' -- --all' : ''}\` to actually POST to IndexNow.`)
    return
  }

  // Verify key file is publicly reachable BEFORE submitting (otherwise IndexNow rejects)
  console.log(`Verifying key file at ${KEY_LOCATION}...`)
  const verifyRes = await fetch(KEY_LOCATION)
  if (!verifyRes.ok) {
    console.error(`\n❌ Key file not reachable (${verifyRes.status}). Deploy public/${KEY}.txt first, then re-run.\n`)
    process.exit(1)
  }
  const verifyBody = (await verifyRes.text()).trim()
  if (verifyBody !== KEY) {
    console.error(`\n❌ Key file content mismatch. Expected "${KEY}", got "${verifyBody.slice(0, 80)}".\n`)
    process.exit(1)
  }
  console.log('  ✓ Key file reachable + content matches')
  console.log('')

  // Batch submit (IndexNow allows up to 10,000 URLs per request)
  const batches = chunk(unique, BATCH_CAP)
  let submittedTotal = 0
  let failedBatches = 0 // Phase 10 #73 — track failures so the run exits non-zero
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const body = {
      host: SITE,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: batch,
    }
    const res = await fetch(INDEXNOW_HOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    if (res.ok || res.status === 200 || res.status === 202) {
      submittedTotal += batch.length
      console.log(`  ✓ Batch ${i + 1}/${batches.length} (${batch.length} URLs) — ${res.status} ${res.statusText}`)
    } else {
      failedBatches++
      console.error(`  ✗ Batch ${i + 1}/${batches.length} — ${res.status} ${res.statusText}: ${text.slice(0, 300)}`)
    }
  }

  console.log('')
  console.log(`✓ Submitted ${submittedTotal} URLs to IndexNow.`)
  console.log(`  Bing typically begins crawling within 24h.`)
  console.log(`  Track: https://www.bing.com/webmasters → IndexNow tab`)

  // Phase 10 #73 — exit non-zero if any batch failed, so the daily run surfaces
  // as a failure (was silently green even when submissions were rejected).
  if (failedBatches > 0) {
    console.error(`\n❌ ${failedBatches} batch(es) failed — exiting non-zero.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
