/**
 * Phase 7N (2026-05-16) — Bing Webmaster direct URL submission.
 *
 * Complements IndexNow (which also notifies Bing). Direct submission
 * via the Bing Webmaster API can be a stronger crawl signal for
 * brand-new content because it goes through Bing's authenticated
 * intake rather than the generic IndexNow firehose.
 *
 * USAGE:
 *   npm run bing:submit:dry          # list URLs that would be submitted
 *   npm run bing:submit              # submit /compare URLs
 *   npm run bing:submit -- --tools   # submit /tools URLs
 *   npm run bing:submit -- --all     # everything
 *
 * REQUIRED ENV:
 *   BING_WEBMASTER_API_KEY (get from https://www.bing.com/webmasters →
 *     Settings → API Access → Generate Key)
 *
 * QUOTAS: 500 URLs/site/day. Script chunks into 500-URL batches and
 * fails fast if the daily quota is exceeded. The Bing SubmitUrlbatch
 * endpoint caps individual requests at 500 URLs.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

const SITE_URL = 'https://rightaichoice.com'
const BING_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'
const PER_REQUEST_CAP = 500
const DAILY_QUOTA = 500

type Args = {
  dry: boolean
  includeTools: boolean
  includeCategories: boolean
  includeBest: boolean
  includeAlternatives: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const all = argv.includes('--all')
  return {
    dry: argv.includes('--dry'),
    includeTools: all || argv.includes('--tools'),
    includeCategories: all || argv.includes('--categories'),
    includeBest: all || argv.includes('--best'),
    includeAlternatives: all || argv.includes('--alternatives'),
  }
}

async function gatherUrls(args: Args): Promise<string[]> {
  const supabase = getAdminClient()
  const urls: string[] = []

  // Always include compare pages.
  const { data: comparisons } = await supabase
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
  if (comparisons) {
    for (const c of comparisons as { slug: string }[]) {
      urls.push(`${SITE_URL}/compare/${c.slug}`)
    }
  }

  if (args.includeTools) {
    const { data: tools } = await supabase
      .from('tools')
      .select('slug')
      .eq('is_published', true)
    for (const t of (tools as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/tools/${t.slug}`)
    }
  }
  if (args.includeAlternatives) {
    const { data: tools } = await supabase
      .from('tools')
      .select('slug')
      .eq('is_published', true)
    for (const t of (tools as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/tools/${t.slug}/alternatives`)
    }
  }
  if (args.includeCategories) {
    const { data: cats } = await supabase.from('categories').select('slug')
    for (const c of (cats as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/categories/${c.slug}`)
    }
  }
  if (args.includeBest) {
    // BEST_PAGES is a const; not in DB. Skip for now — operator submits
    // /best/* via dashboard since it's a small constant set.
  }

  return urls
}

async function submitChunk(apiKey: string, urls: string[]): Promise<void> {
  const url = `${BING_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList: urls }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Bing API ${res.status}: ${text.slice(0, 300)}`)
  }
  console.log(`  ✓ Submitted batch of ${urls.length}: HTTP ${res.status}`)
}

async function main() {
  const args = parseArgs()
  const apiKey = process.env.BING_WEBMASTER_API_KEY
  const urls = await gatherUrls(args)

  console.log(`[bing] gathered ${urls.length} URLs`)

  if (args.dry) {
    console.log('Dry-run — first 20:')
    urls.slice(0, 20).forEach((u) => console.log(`  ${u}`))
    return
  }

  if (!apiKey) {
    console.error(
      '\n❌ BING_WEBMASTER_API_KEY missing. Get one at:',
      '\n   https://www.bing.com/webmasters → Settings → API Access',
    )
    process.exit(1)
  }

  if (urls.length > DAILY_QUOTA) {
    console.warn(
      `[bing] ${urls.length} URLs exceeds 500/day Bing quota. Submitting first 500 only.`,
    )
    urls.length = DAILY_QUOTA
  }

  // Chunk into 500-URL batches (Bing's per-request cap).
  for (let i = 0; i < urls.length; i += PER_REQUEST_CAP) {
    const chunk = urls.slice(i, i + PER_REQUEST_CAP)
    await submitChunk(apiKey, chunk)
  }

  console.log(`\n✓ Submitted ${urls.length} URLs to Bing Webmaster.`)
  console.log(`  Verify at https://www.bing.com/webmasters → Submit URLs.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
