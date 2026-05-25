/**
 * End-to-end tracking verification — drives a real Chrome browser through
 * a realistic user journey on the live site, then queries Supabase to
 * confirm every expected event landed in public.user_events with the
 * right shape.
 *
 * What it proves (that no static analysis can):
 *   • analytics.pageViewed() actually fires in the browser on route change
 *   • analytics.toolPageViewed() fires when /tools/[slug] mounts
 *   • The /api/track-mirror beacon reaches Supabase before page unload
 *   • The server-source tool_visit_redirected event lands on affiliate click
 *
 * Uses local Chrome via puppeteer-core (no Chromium download). Tags every
 * step with a unique session marker (PROBE_TAG) so we can isolate this
 * run's events from organic traffic.
 *
 * Run with: tsx scripts/audit/e2e-tracking-verification.ts
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://rightaichoice.com'
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

// Unique tag for this run — every event we look for must land within this
// window AND share this distinct_id (read from the live page after init).
const PROBE_TAG = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const RUN_STARTED = new Date()

type Step = { name: string; ok: boolean; detail: string }
const steps: Step[] = []

function log(name: string, ok: boolean, detail: string) {
  const mark = ok ? '✓' : '✗'
  console.log(`${mark} ${name}${detail ? ' — ' + detail : ''}`)
  steps.push({ name, ok, detail })
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function main(): Promise<void> {
  console.log(`E2E tracking verification — probe tag: ${PROBE_TAG}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Started:  ${RUN_STARTED.toISOString()}\n`)

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let mixpanelDistinctId: string | null = null
  let toolSlug: string | null = null

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ${PROBE_TAG}`,
    )
    page.setDefaultNavigationTimeout(60_000)

    // ── Step 1: load homepage and let Mixpanel init ────────────
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle2' })
    await sleep(5000) // give the analytics provider effects + mixpanel init time
    // Mixpanel stores distinct_id in localStorage under `mp_<token>_mixpanel`.
    // Reading the raw entry is more reliable than poking at window.mixpanel,
    // which the library doesn't always attach in modern builds.
    mixpanelDistinctId = await page.evaluate(() => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key || !key.startsWith('mp_') || !key.endsWith('_mixpanel')) continue
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const parsed = JSON.parse(raw) as { distinct_id?: string }
          if (parsed.distinct_id) return parsed.distinct_id
        }
        return null
      } catch {
        return null
      }
    })
    log('Step 1: homepage loaded + mixpanel distinct_id captured',
      !!mixpanelDistinctId, mixpanelDistinctId ?? 'NO DISTINCT_ID')

    if (!mixpanelDistinctId) {
      throw new Error('Mixpanel never initialized — analytics pipeline is broken upstream of Fix #1')
    }

    // ── Step 2: navigate to a tool page (triggers route-change page_viewed + tool_page_viewed) ──
    // Pick a known-good slug from the catalog.
    const { data: tools } = await db.from('tools').select('slug').eq('is_published', true).limit(1)
    toolSlug = tools?.[0]?.slug ?? 'chatgpt'
    await page.goto(`${BASE_URL}/tools/${toolSlug}`, { waitUntil: 'networkidle2' })
    await sleep(2500)
    log('Step 2: navigated to /tools/' + toolSlug, true, '')

    // ── Step 3: scroll halfway down to trigger scroll_depth_reached ──
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await sleep(1500)
    log('Step 3: scrolled to 50%', true, '')

    // ── Step 4: trigger pagehide so the sendBeacon flush fires ──
    // (analytics queue flushes every 8s OR on pagehide; we force pagehide)
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle2' })
    await sleep(2000)
    log('Step 4: navigated back to / (triggers flush)', true, '')

    // ── Step 5: exercise the affiliate-visit redirect (Fix #4) ──
    // The browser button itself opens a new tab with target="_blank" which
    // is awkward to follow in puppeteer. We instead hit the same endpoint
    // the way the button does — with ?d=<mixpanel distinct_id>&ref=/tools/[slug]
    // — using the browser's own fetch so cookies + UA flow through.
    const visitResp = await page.evaluate(async (slug, did) => {
      const url = `/api/tools/${slug}/visit?d=${encodeURIComponent(did)}&ref=${encodeURIComponent('/tools/' + slug)}&src=e2e_probe`
      // Use no-redirect so we don't actually leave the page.
      const r = await fetch(url, { redirect: 'manual' }).catch(() => null)
      return { ok: r !== null, status: r?.status ?? 0, type: r?.type ?? 'unknown' }
    }, toolSlug!, mixpanelDistinctId!)
    log('Step 5: GET /api/tools/[slug]/visit?d=…',
      visitResp.ok && (visitResp.status === 302 || visitResp.type === 'opaqueredirect'),
      `status=${visitResp.status} type=${visitResp.type}`)

    // ── Step 6: wait for the flush + server mirror to reach Supabase ──
    await sleep(6000)
  } finally {
    await browser.close()
  }

  // ── Verify events landed in user_events ────────────────────────
  console.log('\nQuerying user_events for this session…')

  const sinceIso = RUN_STARTED.toISOString()
  const { data: events, error } = await db
    .from('user_events')
    .select('event_name, page_path, source_kind, properties, created_at')
    .eq('distinct_id', mixpanelDistinctId!)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })

  if (error) {
    log('FATAL: query failed', false, error.message)
    process.exit(1)
  }

  const evs = events ?? []
  console.log(`Found ${evs.length} events for distinct_id=${mixpanelDistinctId}\n`)
  for (const e of evs) {
    const eAny = e as unknown as { event_name: string; page_path: string | null; source_kind: string; created_at: string }
    console.log(`  ${eAny.created_at}  ${eAny.event_name.padEnd(28)} ${eAny.page_path ?? '-'}  [${eAny.source_kind}]`)
  }
  console.log()

  // Assertions — these are the actual proofs for each fix
  const hasPageViewed = evs.some((e) => (e as { event_name: string }).event_name === 'page_viewed')
  const pageViewedOnHome = evs.some((e) => {
    const ev = e as { event_name: string; page_path: string | null }
    return ev.event_name === 'page_viewed' && ev.page_path === '/'
  })
  const pageViewedOnTool = evs.some((e) => {
    const ev = e as { event_name: string; page_path: string | null }
    return ev.event_name === 'page_viewed' && ev.page_path?.startsWith('/tools/')
  })
  const hasToolPageViewed = evs.some((e) => {
    const ev = e as { event_name: string; properties: Record<string, unknown> }
    return ev.event_name === 'tool_page_viewed' && ev.properties?.tool_slug === toolSlug
  })
  const hasScroll = evs.some((e) => (e as { event_name: string }).event_name === 'scroll_depth_reached')
  const hasVisitRedirect = evs.some((e) => {
    const ev = e as { event_name: string; source_kind: string; properties: Record<string, unknown> }
    return ev.event_name === 'tool_visit_redirected' && ev.source_kind === 'server' && ev.properties?.tool_slug === toolSlug
  })

  log('Fix #1.a: page_viewed event in user_events', hasPageViewed, '')
  log('Fix #1.b: page_viewed has page_path = /', pageViewedOnHome, '')
  log('Fix #1.c: page_viewed fires on route change to /tools/[slug]', pageViewedOnTool, '')
  log('Fix #2:   tool_page_viewed fires with correct tool_slug', hasToolPageViewed, '')
  log('Fix #4:   tool_visit_redirected lands with source_kind=server', hasVisitRedirect, '')
  log('Sanity:   scroll_depth_reached still works (proves same pipeline)', hasScroll, '')

  const failed = steps.filter((s) => !s.ok)
  console.log(`\n${failed.length === 0 ? '✓ ALL VERIFIED' : `✗ ${failed.length} FAILED`}`)

  // Clean up our test events so we don't pollute production analytics.
  if (mixpanelDistinctId && evs.length > 0) {
    await db.from('user_events').delete().eq('distinct_id', mixpanelDistinctId).gte('created_at', sinceIso)
    console.log(`Cleaned up ${evs.length} test events.`)
  }

  // Best-effort: ensure no stale headless chrome lingers if puppeteer crashed.
  try { execSync('pgrep -af "Google Chrome.*--remote-debugging-pipe" || true') } catch { /* noop */ }

  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(2)
})
