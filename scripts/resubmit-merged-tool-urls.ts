/**
 * Day 7 (2026-05-26) — Force re-crawl of merged tool URLs.
 *
 * Diagnostic context: GSC snapshot 2026-05-26 (28d window) showed 21 of 67
 * merged tools (is_published=false, merged_into is not null) still appearing
 * in search results. /tools/[slug] already 308-redirects them to the canonical
 * tool, but Google/Bing won't drop the source URL from their index until they
 * actually re-crawl it. This script triggers that re-crawl via IndexNow (hits
 * Bing/Yandex) + the Bing Webmaster direct submission API.
 *
 * USAGE:
 *   npm run resubmit:merged:dry        # list the URLs that would be submitted
 *   npm run resubmit:merged            # submit to IndexNow + Bing
 *
 * SAFETY: Only submits URLs where the row has merged_into set. The redirect
 * is already live (verified in app/tools/[slug]/page.tsx) so crawlers will
 * see the 308 immediately. No content changes.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

const SITE = 'rightaichoice.com'
const SITE_URL = `https://${SITE}`

// IndexNow (Bing/Yandex)
const INDEXNOW_HOST = 'https://api.indexnow.org/indexnow'
const INDEXNOW_KEY = '1ddd347878cead47f293292da0707a19'
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`

// Bing Webmaster direct
const BING_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run')

async function gatherMergedToolUrls(): Promise<string[]> {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('tools')
    .select('slug')
    .eq('is_published', false)
    .not('merged_into', 'is', null)
  if (error) throw new Error(`fetch merged tools: ${error.message}`)
  return ((data as { slug: string }[]) ?? []).map((t) => `${SITE_URL}/tools/${t.slug}`)
}

async function submitIndexNow(urls: string[]): Promise<void> {
  const res = await fetch(INDEXNOW_HOST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: SITE,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: urls,
    }),
  })
  const text = await res.text()
  if (!res.ok && res.status !== 202) {
    throw new Error(`IndexNow ${res.status}: ${text.slice(0, 300)}`)
  }
  console.log(`  ✓ IndexNow accepted ${urls.length} URLs (HTTP ${res.status})`)
}

async function submitBing(urls: string[]): Promise<void> {
  const apiKey = process.env.BING_WEBMASTER_API_KEY
  if (!apiKey) {
    console.warn('  ⚠ BING_WEBMASTER_API_KEY missing — skipping Bing direct submit')
    return
  }
  const url = `${BING_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList: urls }),
  })
  const text = await res.text()
  if (!res.ok) {
    // Quota exhaustion is non-fatal — IndexNow already notified Bing on the
    // hop above, so this is a redundant signal. Just log and continue.
    if (res.status === 400 && text.includes('quota')) {
      console.warn(`  ⚠ Bing daily quota exhausted (already covered via IndexNow): ${text.slice(0, 120)}`)
      return
    }
    throw new Error(`Bing ${res.status}: ${text.slice(0, 300)}`)
  }
  console.log(`  ✓ Bing accepted ${urls.length} URLs (HTTP ${res.status})`)
}

async function main() {
  const urls = await gatherMergedToolUrls()
  console.log(`Found ${urls.length} merged tool URLs (is_published=false, merged_into set)`)

  if (urls.length === 0) {
    console.log('No merged tools to resubmit — exiting.')
    return
  }

  if (isDry) {
    console.log('\nDry-run — would submit:')
    urls.slice(0, 30).forEach((u) => console.log(`  ${u}`))
    if (urls.length > 30) console.log(`  … and ${urls.length - 30} more`)
    return
  }

  console.log('\n→ IndexNow (Bing/Yandex)')
  await submitIndexNow(urls)

  console.log('\n→ Bing Webmaster direct')
  await submitBing(urls)

  console.log(`\n✓ ${urls.length} merged tool URLs queued for re-crawl.`)
  console.log('  Crawlers will hit /tools/<slug>, see the 308, and drop the source URL.')
  console.log('  Expect index removal in 2–14 days depending on crawl budget.')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
