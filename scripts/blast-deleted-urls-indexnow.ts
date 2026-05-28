/**
 * Phase 9 Day-4 (2026-05-29) — Push the 410 deindex signal to Bing/Yandex.
 *
 * After the non-AI tool purge, 64 /tools/<slug> and 28 /compare/<slug> URLs
 * return HTTP 410 Gone. IndexNow is the fastest pipe to get crawlers to
 * re-fetch and drop them. Submitting deleted URLs is the documented IndexNow
 * pattern for deindexation — "URL changed, please re-crawl" → crawler sees
 * 410 → URL drops out of the index.
 *
 * Bing Webmaster's SubmitUrlbatch is NOT used here — it's for adding/updating
 * content. IndexNow alone covers the deletion signal cleanly.
 *
 * USAGE:
 *   npm run indexnow:deleted:dry      # preview the URL list
 *   npm run indexnow:deleted          # submit to IndexNow
 *
 * COST: free. Quota: 10,000/req, no documented daily cap.
 */
export {}

import { DELETED_TOOL_SLUGS, DELETED_COMPARE_SLUGS } from '../lib/seo/deleted-tools'

const SITE = 'rightaichoice.com'
const SITE_URL = `https://${SITE}`
const INDEXNOW_HOST = 'https://api.indexnow.org/indexnow'
const INDEXNOW_KEY = '1ddd347878cead47f293292da0707a19'
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run') || args.includes('--dry')

function buildUrls(): string[] {
  const urls: string[] = []
  for (const slug of DELETED_TOOL_SLUGS) urls.push(`${SITE_URL}/tools/${slug}`)
  for (const slug of DELETED_COMPARE_SLUGS) urls.push(`${SITE_URL}/compare/${slug}`)
  return urls
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

async function main() {
  const urls = buildUrls()
  console.log(`Tools deleted:    ${DELETED_TOOL_SLUGS.size}`)
  console.log(`Compares deleted: ${DELETED_COMPARE_SLUGS.size}`)
  console.log(`Total URLs:       ${urls.length}`)
  console.log(`Mode:             ${isDry ? 'DRY-RUN' : 'SUBMIT'}`)
  console.log('')

  if (urls.length === 0) {
    console.log('Nothing to submit — exiting.')
    return
  }

  if (isDry) {
    console.log('First 20 URLs:')
    urls.slice(0, 20).forEach((u) => console.log(`  · ${u}`))
    if (urls.length > 20) console.log(`  … and ${urls.length - 20} more`)
    console.log('')
    console.log('Re-run with `npm run indexnow:deleted` to actually POST.')
    return
  }

  // Verify the IndexNow key file is reachable before posting (otherwise
  // IndexNow silently rejects without a useful error).
  console.log(`Verifying key file at ${INDEXNOW_KEY_LOCATION}...`)
  const verify = await fetch(INDEXNOW_KEY_LOCATION)
  if (!verify.ok) {
    console.error(`\n❌ Key file not reachable (${verify.status}). Cannot submit.\n`)
    process.exit(1)
  }
  const body = (await verify.text()).trim()
  if (body !== INDEXNOW_KEY) {
    console.error(`\n❌ Key file content mismatch. Got "${body.slice(0, 80)}".\n`)
    process.exit(1)
  }
  console.log('  ✓ Key file reachable + matches')
  console.log('')

  console.log('→ Submitting to IndexNow (Bing + Yandex)')
  await submitIndexNow(urls)

  console.log('')
  console.log(`✓ Submitted ${urls.length} deleted URLs for re-crawl.`)
  console.log('  Bing/Yandex will re-fetch, see HTTP 410 Gone, and drop the')
  console.log('  URLs from their indices. Typical deindexation: 2-14 days.')
  console.log('  Track: https://www.bing.com/webmasters → IndexNow tab')
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
