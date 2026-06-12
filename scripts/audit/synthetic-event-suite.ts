/**
 * Phase 10.3.5 — Synthetic event-verification suite.
 *
 * For EVERY event in lib/analytics-schema.ts EVENT_SCHEMAS (the 79 firing
 * events), this suite executes a "firing recipe" and then asserts the exact
 * row landed in public.user_events:
 *
 *   browser recipes — a real Chrome (puppeteer-core, same launch pattern as
 *     scripts/audit/e2e-tracking-verification.ts) drives real pages on
 *     localhost. The Mixpanel distinct_id is pre-seeded into localStorage
 *     (`mp_<token>_mixpanel`, persistence:'localStorage' — see
 *     components/providers/mixpanel-provider.tsx) so every mirrored event
 *     carries a tagged `e2e-<runid>-b<n>` id. Events flush via the 8s mirror
 *     timer or the pagehide sendBeacon (lib/analytics.ts) — each journey ends
 *     with a navigation to about:blank to force the beacon.
 *
 *   payload recipes — canonical MirrorEvent batches POSTed straight to
 *     /api/track-mirror for everything browser automation can't safely or
 *     cheaply trigger (payments, OAuth modal outcomes, server emitters, AI
 *     generation). Properties are built FROM the event's zod schema and
 *     validated locally before sending. SERVER_ONLY_EVENTS are exercised this
 *     way too — that proves ingest + dedup + storage, NOT the real server
 *     emitter (labeled `server-only` in the coverage report).
 *
 * Assertions per event (poll user_events up to ~20s via the admin client):
 *   1. row exists with the tagged distinct_id + event_name
 *   2. row.properties passes validateEvent (strict, base-context stripped)
 *   3. envelope: properties.session_id + device_type + page_path populated
 *   4. properties.schema_valid is ABSENT or true (row not tagged invalid)
 *
 * Plus: dedup probe (3 events double-fired with explicit insert_ids → exactly
 * 1 row each) and a built-in negative test (malformed payload → row lands
 * WITH schema_valid=false + schema_issues — tag-don't-drop proven).
 *
 * Cleanup always runs unless --keep: deletes user_events +
 * user_intent_profile rows for distinct_id LIKE 'e2e-<runid>%'.
 *
 * Run: npm run tracking:synthetic
 * Flags:
 *   --event=<name>            run a single recipe (browser recipes run their
 *                             whole journey's actions, assert only the one)
 *   --mode=browser|payload|all   default all (all = + dedup + negative)
 *   --keep                    skip cleanup (leave tagged rows for inspection)
 *   --base-url=<url>          default http://localhost:3000; if unreachable
 *                             the suite starts `npm run dev` itself.
 *
 * Coverage report: printed + written to docs/admin/synthetic-coverage.json.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import {
  EVENT_SCHEMAS,
  SCHEMA_EVENT_NAMES,
  SERVER_ONLY_EVENTS,
  validateEvent,
  type KnownEventName,
} from '../../lib/analytics-schema'
import { classifyChannel } from '../../lib/analytics/channels'
import { getAdminClient } from '../../lib/cron/supabase-admin'

// ── Flags ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
function flagValue(name: string): string | null {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const ONLY_EVENT = flagValue('event')
const MODE = (flagValue('mode') ?? 'all') as 'browser' | 'payload' | 'all'
const KEEP = argv.includes('--keep')
const BASE_URL = (flagValue('base-url') ?? 'http://localhost:3000').replace(/\/$/, '')

if (!['browser', 'payload', 'all'].includes(MODE)) {
  console.error(`Invalid --mode=${MODE} (browser|payload|all)`)
  process.exit(2)
}

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
if (!MIXPANEL_TOKEN) {
  console.error('NEXT_PUBLIC_MIXPANEL_TOKEN missing — run via `npm run tracking:synthetic` (tsx --env-file=.env.local)')
  process.exit(2)
}

// ── Run identity ─────────────────────────────────────────────────────
// RUNID = e2e-<timestamp>; every synthetic distinct_id is `${RUNID}-<n>`.
const RUNID = `e2e-${Date.now().toString(36)}`
const RUN_STARTED = new Date()
const db = getAdminClient()

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// ── Result bookkeeping ───────────────────────────────────────────────
type EventResult = {
  event: string
  mode: 'browser' | 'payload'
  ok: boolean
  ms: number
  distinct_id: string
  note?: string
  error?: string
}
const results: EventResult[] = []
let dedupPassed = 0
let dedupTotal = 0
let negativePassed: boolean | null = null
// 10.7a — channel-classification probes (browser paid + payload ai).
let channelBrowserPassed: boolean | null = null
let channelPayloadPassed: boolean | null = null

// ── Dev-server management ────────────────────────────────────────────
let devServer: ChildProcess | null = null

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    return res.status < 500
  } catch {
    return false
  }
}

async function ensureServer(): Promise<void> {
  if (await isReachable(BASE_URL)) {
    console.log(`Server already running at ${BASE_URL}`)
    return
  }
  console.log(`No server at ${BASE_URL} — starting \`npm run dev\` …`)
  const logFile = fs.openSync(path.join(process.cwd(), '.synthetic-dev-server.log'), 'w')
  devServer = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFile, logFile],
  })
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    if (await isReachable(BASE_URL)) {
      console.log('Dev server is up.')
      return
    }
    await sleep(2000)
  }
  throw new Error('Dev server did not become reachable within 240s (see .synthetic-dev-server.log)')
}

function stopServer(): void {
  if (!devServer?.pid) return
  try {
    process.kill(-devServer.pid, 'SIGTERM')
    console.log('Stopped the dev server this suite started.')
  } catch {
    try { devServer.kill('SIGTERM') } catch { /* already dead */ }
  }
  devServer = null
}

// ── DB assertion helpers ─────────────────────────────────────────────
type UserEventRow = {
  event_name: string
  distinct_id: string
  properties: Record<string, unknown> | null
  page_path: string | null
  device_type: string | null
  source_kind: string | null
  insert_id: string | null
  created_at: string
}

async function fetchRows(distinctId: string, eventName: string): Promise<UserEventRow[]> {
  const { data, error } = await db
    .from('user_events')
    .select('event_name, distinct_id, properties, page_path, device_type, source_kind, insert_id, created_at')
    .eq('distinct_id', distinctId)
    .eq('event_name', eventName)
    .gte('created_at', new Date(RUN_STARTED.getTime() - 60_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw new Error(`user_events query failed: ${error.message}`)
  return (data ?? []) as unknown as UserEventRow[]
}

/** Poll user_events up to ~20s; run all four per-event assertions. */
async function assertEvent(
  event: string,
  mode: 'browser' | 'payload',
  distinctId: string,
  note?: string,
): Promise<void> {
  const t0 = Date.now()
  const deadline = t0 + 21_000
  let rows: UserEventRow[] = []
  while (Date.now() < deadline) {
    rows = await fetchRows(distinctId, event)
    if (rows.length > 0) break
    await sleep(1500)
  }
  const issues: string[] = []
  if (rows.length === 0) {
    issues.push(`no row for distinct_id=${distinctId}`)
  } else {
    const row = rows[0]
    const props = (row.properties ?? {}) as Record<string, unknown>
    // (2) strict schema check on the stored properties
    const v = validateEvent(event, props)
    if (!v.ok) issues.push(`stored properties fail schema: ${v.issues.join('; ')}`)
    // (3) envelope
    if (typeof props.session_id !== 'string' || props.session_id.length === 0) {
      issues.push('properties.session_id missing')
    }
    if (!row.device_type) issues.push('device_type column null')
    if (!row.page_path) issues.push('page_path column null')
    // (3b) 10.7b — environment envelope: every event captured by a REAL
    // browser must carry the env_* keys getEnvContext() stamps (payload
    // recipes POST raw MirrorEvents and legitimately lack them). Async /
    // Chromium-optional keys (env_ad_blocker, env_connection_*, env_dnt,
    // env_device_memory) are deliberately not asserted.
    if (mode === 'browser') {
      for (const k of ['env_locale', 'env_timezone', 'env_color_scheme']) {
        if (typeof props[k] !== 'string' || (props[k] as string).length === 0) issues.push(`properties.${k} missing`)
      }
      for (const k of ['env_viewport_w', 'env_viewport_h', 'env_screen_w', 'env_screen_h', 'env_dpr', 'env_cpu_cores']) {
        if (typeof props[k] !== 'number') issues.push(`properties.${k} missing`)
      }
      for (const k of ['env_touch', 'env_cookie_enabled']) {
        if (typeof props[k] !== 'boolean') issues.push(`properties.${k} missing`)
      }
    }
    // (4) not tagged schema-invalid
    if (props.schema_valid === false) {
      issues.push(`row tagged schema_valid=false: ${JSON.stringify(props.schema_issues ?? [])}`)
    }
  }
  const ok = issues.length === 0
  results.push({
    event,
    mode,
    ok,
    ms: Date.now() - t0,
    distinct_id: distinctId,
    note,
    error: ok ? undefined : issues.join(' | '),
  })
  console.log(`${ok ? '  ✓' : '  ✗'} [${mode}] ${event}${note ? ` (${note})` : ''}${ok ? '' : ' — ' + issues.join(' | ')}`)
}

// ── Payload (track-mirror) helpers ───────────────────────────────────
type MirrorEvent = {
  event_name: string
  distinct_id: string
  user_id?: string | null
  auth_state?: 'anon' | 'known'
  properties?: Record<string, unknown>
  page_path?: string
  referrer?: string
  device_type?: 'mobile' | 'tablet' | 'desktop'
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  first_touch_utm_source?: string
  first_touch_referrer?: string
  first_touch_landing?: string
  insert_id?: string
  client_time_ms?: number
}

let payloadSeq = 0

function buildMirrorEvent(
  event: string,
  props: Record<string, unknown>,
  distinctId: string,
  overrides: Partial<MirrorEvent> = {},
): MirrorEvent {
  return {
    event_name: event,
    distinct_id: distinctId,
    user_id: null,
    auth_state: 'anon',
    properties: { ...props, session_id: `sess-${distinctId}` },
    page_path: overrides.page_path ?? '/synthetic',
    referrer: '',
    device_type: 'desktop',
    first_touch_referrer: 'https://www.google.com/',
    first_touch_landing: '/synthetic',
    insert_id: overrides.insert_id ?? randomUUID(),
    client_time_ms: Date.now(),
    ...overrides,
  }
}

async function postMirror(events: MirrorEvent[]): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}/api/track-mirror`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(() => null)
    if (res?.ok) return
    if (res && res.status !== 503) throw new Error(`/api/track-mirror HTTP ${res.status}`)
    await sleep(500 * (attempt + 1))
  }
  throw new Error('/api/track-mirror unreachable after 3 attempts')
}

/**
 * Fire one canonical payload event. Validates locally FIRST (a recipe bug
 * should fail loudly here, not land as a schema_valid=false row in prod).
 */
async function firePayload(event: string, props: Record<string, unknown>): Promise<string> {
  const local = validateEvent(event, props)
  if (!local.ok) {
    throw new Error(`recipe payload for ${event} fails its own schema: ${local.issues.join('; ')}`)
  }
  const distinctId = `${RUNID}-p${++payloadSeq}`
  await postMirror([buildMirrorEvent(event, props, distinctId)])
  return distinctId
}

// ── Browser helpers ──────────────────────────────────────────────────
type Slugs = { tool: string; category: string; compare: string }

type BrowserCtx = {
  page: Page
  baseUrl: string
  distinctId: string
  slugs: Slugs
}

async function discoverSlugs(): Promise<Slugs> {
  const { data: tools } = await db.from('tools').select('slug').eq('is_published', true).limit(1)
  const tool = (tools?.[0] as { slug?: string } | undefined)?.slug
  const { data: cats } = await db.from('categories').select('slug').limit(1)
  const category = (cats?.[0] as { slug?: string } | undefined)?.slug
  const { data: cmps } = await db.from('tool_comparisons').select('slug').limit(5)
  let compare: string | undefined
  for (const c of (cmps ?? []) as Array<{ slug: string }>) {
    const res = await fetch(`${BASE_URL}/compare/${c.slug}`, { redirect: 'manual' }).catch(() => null)
    if (res?.status === 200) { compare = c.slug; break }
  }
  if (!tool || !category || !compare) {
    throw new Error(`slug discovery failed (tool=${tool} category=${category} compare=${compare})`)
  }
  return { tool, category, compare }
}

/** Seeds the Mixpanel localStorage persistence (and our fallback id) so the
 *  SDK boots with OUR tagged distinct_id — same trick the existing e2e
 *  script reads back, just inverted (write instead of read). */
function seedScript(token: string, distinctId: string): string {
  return `(() => {
    try {
      const key = 'mp_${token}_mixpanel'
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ distinct_id: '${distinctId}', '$device_id': '${distinctId}' }))
      }
      localStorage.setItem('rac_fallback_distinct_id', '${distinctId}')
    } catch {}
  })()`
}

async function newJourneyPage(browser: Browser, distinctId: string): Promise<Page> {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  page.setDefaultNavigationTimeout(120_000)
  page.setDefaultTimeout(30_000)
  await page.evaluateOnNewDocument(seedScript(MIXPANEL_TOKEN!, distinctId))
  return page
}

async function gotoAndSettle(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body')
  // Give the analytics provider effects + Mixpanel init + mount trackers time.
  await sleep(2500)
}

// NOTE on page.evaluate style: every evaluate in this file uses the STRING
// form, not a function. tsx/esbuild decorates compiled closures with a
// `__name` helper that does not exist in the page context, so function-form
// evaluates throw `__name is not defined` at runtime. Template-literal
// scripts bypass the compiler entirely.
async function verifySeededDistinctId(page: Page, expected: string): Promise<void> {
  const actual = (await page.evaluate(`(() => {
    try {
      const raw = localStorage.getItem('mp_${MIXPANEL_TOKEN}_mixpanel')
      if (!raw) return null
      return JSON.parse(raw).distinct_id ?? null
    } catch {
      return null
    }
  })()`)) as string | null
  if (actual !== expected) {
    throw new Error(`distinct_id seed failed: expected ${expected}, mixpanel has ${actual}`)
  }
}

/** End a journey: let the 8s mirror timer breathe, then force the pagehide
 *  sendBeacon flush by leaving the page (the e2e script's flush trick). */
async function flushJourney(page: Page): Promise<void> {
  await sleep(1500)
  await page.goto('about:blank').catch(() => {})
  await sleep(2000)
  const ctx = page.browserContext()
  await page.close().catch(() => {})
  await ctx.close().catch(() => {})
}

async function clickVisibleButtonByText(page: Page, text: string): Promise<void> {
  // DOM click (string-form evaluate) — React's root-delegated onClick handles
  // dispatched click events fine; avoids handle round-trips entirely.
  const clicked = (await page.evaluate(`(() => {
    const label = ${JSON.stringify(text)}
    const buttons = Array.from(document.querySelectorAll('button'))
    const b = buttons.find(
      (x) => (x.textContent || '').trim() === label && x.offsetParent !== null,
    )
    if (!b) return false
    b.click()
    return true
  })()`)) as boolean
  if (!clicked) throw new Error(`no visible <button> with text "${text}"`)
}

// ── Recipe table ─────────────────────────────────────────────────────
// One entry per FIRED event (every key of EVENT_SCHEMAS — verified at boot).
// Browser recipes run IN ARRAY ORDER within their journey on a shared page;
// `piggyback` notes mark events emitted by an earlier step's real action.
type Recipe = {
  event: KnownEventName
  mode: 'browser' | 'payload'
  /** browser only: which shared-page journey this step belongs to */
  journey?: 1 | 2
  note?: string
  /** browser: drive the page. payload: return props for firePayload(). */
  run: (ctx: BrowserCtx) => Promise<void>
  props?: (slugs: Slugs) => Record<string, unknown>
}

const noop = async () => {}
const UUID_A = randomUUID()
const UUID_B = randomUUID()
const UUID_C = randomUUID()

const RECIPES: Recipe[] = [
  // ════ Journey 1 — homepage (distinct_id <RUNID>-b1) ════════════════
  {
    event: 'page_viewed',
    mode: 'browser',
    journey: 1,
    run: async ({ page, baseUrl, distinctId }) => {
      await gotoAndSettle(page, `${baseUrl}/`)
      await verifySeededDistinctId(page, distinctId)
    },
  },
  {
    event: 'plan_cta_impression',
    mode: 'browser',
    journey: 1,
    note: 'piggyback: fires on homepage GoalInput mount (surface=homepage)',
    run: noop,
  },
  {
    event: 'plan_goal_typed',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      const sel = 'textarea[aria-label*="trying to build"]'
      await page.waitForSelector(sel)
      await page.type(sel, 'Automate support triage for a 10-person SaaS team', { delay: 20 })
      await sleep(1600) // 1s idle commit in use-debounced-text-tracking
    },
  },
  {
    event: 'hero_cta_clicked',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.click('button[aria-label="Plan my stack"]')
      await sleep(800)
    },
  },
  {
    event: 'plan_cta_clicked',
    mode: 'browser',
    journey: 1,
    note: 'piggyback: same "Plan My Stack" click (surface=homepage)',
    run: noop,
  },
  {
    event: 'plan_signup_modal_shown',
    mode: 'browser',
    journey: 1,
    note: 'modal opens for anon users on CTA click; closed without OAuth/skip',
    run: async ({ page }) => {
      await page.waitForSelector('button[aria-label="Close"]')
      await sleep(400)
      await page.click('button[aria-label="Close"]') // avoid /plan navigation (AI cost)
      await sleep(400)
    },
  },
  {
    event: 'scroll_depth_reached',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.evaluate(`(async () => {
        const h = document.documentElement.scrollHeight
        for (const frac of [0.3, 0.6, 1]) {
          window.scrollTo(0, h * frac)
          await new Promise((r) => setTimeout(r, 250))
        }
      })()`)
      await sleep(600)
    },
  },
  {
    event: 'context_menu_opened',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.evaluate('window.scrollTo(0, 0)')
      await sleep(300)
      await page.click('h1', { button: 'right' })
      await sleep(400)
    },
  },
  {
    event: 'copy_text_event',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.evaluate(`(() => {
        const el = document.querySelector('h1') || document.body
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        if (sel) { sel.removeAllRanges(); sel.addRange(range) }
        document.dispatchEvent(new Event('copy'))
      })()`)
      await sleep(400)
    },
  },
  {
    event: 'paste_text_event',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.evaluate(`(() => {
        const el = document.querySelector('textarea') || document.body
        el.dispatchEvent(new Event('paste', { bubbles: true }))
      })()`)
      await sleep(400)
    },
  },
  {
    event: 'tab_visibility_changed',
    mode: 'browser',
    journey: 1,
    run: async ({ page }) => {
      await page.evaluate(`(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        document.dispatchEvent(new Event('visibilitychange'))
      })()`)
      await sleep(500)
    },
  },
  {
    event: 'time_on_page',
    mode: 'browser',
    journey: 1,
    note: 'piggyback: EngagementCapture emits on the same visibility→hidden transition',
    run: noop,
  },

  // ════ Journey 2 — catalog / tool / compare (distinct_id <RUNID>-b2) ═
  {
    event: 'search_typing',
    mode: 'browser',
    journey: 2,
    run: async ({ page, baseUrl, distinctId }) => {
      await gotoAndSettle(page, `${baseUrl}/tools`)
      await verifySeededDistinctId(page, distinctId)
      const sel = 'input[placeholder*="What do you want to do"]'
      await page.waitForSelector(sel)
      await page.type(sel, 'video editing', { delay: 40 })
      await sleep(3500) // 250ms autocomplete debounce + server action + 1s typed-commit
    },
  },
  {
    event: 'search_query_submitted',
    mode: 'browser',
    journey: 2,
    note: 'piggyback: fires on the settled (debounced) navbar query',
    run: noop,
  },
  {
    event: 'search_query_typed',
    mode: 'browser',
    journey: 2,
    note: 'piggyback: 1s-idle commit from the same typing',
    run: noop,
  },
  {
    event: 'tool_page_viewed',
    mode: 'browser',
    journey: 2,
    run: async ({ page, baseUrl, slugs }) => {
      await gotoAndSettle(page, `${baseUrl}/tools/${slugs.tool}`)
    },
  },
  {
    event: 'tool_visit_clicked',
    mode: 'browser',
    journey: 2,
    note: 'navigation prevented so no affiliate redirect / click_logs pollution',
    run: async ({ page }) => {
      const sel = 'a[href^="/api/tools/"]'
      await page.waitForSelector(sel)
      await page.evaluate(`(() => {
        const a = document.querySelector('a[href^="/api/tools/"]')
        if (a) a.addEventListener('click', (e) => e.preventDefault())
      })()`)
      await page.click(sel)
      await sleep(500)
    },
  },
  {
    event: 'compare_tool_added',
    mode: 'browser',
    journey: 2,
    run: async ({ page }) => {
      await clickVisibleButtonByText(page, 'Compare')
      await sleep(500)
    },
  },
  {
    event: 'sentiment_card_viewed',
    mode: 'browser',
    journey: 2,
    run: async ({ page, baseUrl, slugs }) => {
      await gotoAndSettle(page, `${baseUrl}/tools/${slugs.tool}/sentiment`)
    },
  },
  {
    event: 'category_viewed',
    mode: 'browser',
    journey: 2,
    run: async ({ page, baseUrl, slugs }) => {
      await gotoAndSettle(page, `${baseUrl}/categories/${slugs.category}`)
    },
  },
  {
    event: 'comparison_viewed',
    mode: 'browser',
    journey: 2,
    run: async ({ page, baseUrl, slugs }) => {
      await gotoAndSettle(page, `${baseUrl}/compare/${slugs.compare}`)
    },
  },
  {
    event: 'navigation_back',
    mode: 'browser',
    journey: 2,
    note: 'same-document pushState + history.back() → real popstate',
    run: async ({ page }) => {
      await page.evaluate(`(() => {
        history.pushState({}, '', location.href + '#probe')
        history.back()
      })()`)
      await sleep(900)
    },
  },

  // ════ Payload recipes — POST /api/track-mirror ═════════════════════
  // Navigation
  { event: 'nav_cta_clicked', mode: 'payload', run: noop, props: () => ({ cta: 'plan_your_stack', source: 'navbar' }) },

  // Tools
  { event: 'tool_saved', mode: 'payload', run: noop, props: (s) => ({ tool_id: UUID_A, tool_name: 'Synthetic Tool', tool_slug: s.tool }) },
  { event: 'tool_unsaved', mode: 'payload', run: noop, props: (s) => ({ tool_id: UUID_A, tool_name: 'Synthetic Tool', tool_slug: s.tool }) },
  {
    event: 'tool_visit_redirected',
    mode: 'payload',
    note: 'server-only emitter (lib/mixpanel-server.ts) — payload exercises ingest, not the emitter',
    run: noop,
    props: (s) => ({ tool_slug: s.tool, referrer_path: `/tools/${s.tool}`, source: 'server' }),
  },
  { event: 'tool_faq_opened', mode: 'payload', run: noop, props: (s) => ({ tool_slug: s.tool, question_index: 1, question_text: 'How much does it cost?' }) },
  { event: 'viability_badge_clicked', mode: 'payload', run: noop, props: (s) => ({ tool_slug: s.tool, badge: 'safe_bet' }) },
  { event: 'viability_page_viewed', mode: 'payload', run: noop, props: () => ({ slug: 'index', page_type: 'index' }) },

  // Sentiment (client trio require auth/scan state; the rest are server-only)
  { event: 'sentiment_scan_started', mode: 'payload', note: 'requires signed-in user with scan quota', run: noop, props: (s) => ({ tool_slug: s.tool, charge_type: 'free' }) },
  { event: 'sentiment_result_viewed', mode: 'payload', note: 'requires a completed scan', run: noop, props: (s) => ({ tool_slug: s.tool, sentiment_score: 'positive', result_source: 'fresh' }) },
  { event: 'sentiment_pay_clicked', mode: 'payload', note: 'requires paywall state (payments sandboxed)', run: noop, props: (s) => ({ tool_slug: s.tool, gateway: 'paypal' }) },
  { event: 'sentiment_scan_requested', mode: 'payload', note: 'server-only emitter — payload exercises ingest, not the emitter', run: noop, props: (s) => ({ tool_slug: s.tool, charge_type: 'free' }) },
  {
    event: 'sentiment_scan_completed',
    mode: 'payload',
    note: 'server-only emitter — payload exercises ingest, not the emitter',
    run: noop,
    props: (s) => ({ tool_slug: s.tool, charge_type: 'free', duration_ms: 48211, sources: ['reddit', 'youtube', 'x'], mention_count: 25, sentiment_score: 'positive' }),
  },
  { event: 'sentiment_scan_failed', mode: 'payload', note: 'server-only emitter — payload exercises ingest, not the emitter', run: noop, props: (s) => ({ tool_slug: s.tool, charge_type: 'paid', error: 'synthetic: upstream timeout' }) },
  { event: 'sentiment_paywall_shown', mode: 'payload', note: 'server-only emitter — payload exercises ingest, not the emitter', run: noop, props: (s) => ({ tool_slug: s.tool, currency: 'USD', amount_minor: 299 }) },
  { event: 'sentiment_payment_initiated', mode: 'payload', note: 'server-only emitter (payments) — payload exercises ingest, not the emitter', run: noop, props: (s) => ({ gateway: 'paypal', currency: 'USD', amount_minor: 299, tool_slug: s.tool }) },
  { event: 'sentiment_payment_succeeded', mode: 'payload', note: 'server-only emitter (payments) — payload exercises ingest, not the emitter', run: noop, props: () => ({ gateway: 'paypal', credits: 3 }) },
  { event: 'sentiment_payment_failed', mode: 'payload', note: 'server-only emitter (payments) — payload exercises ingest, not the emitter', run: noop, props: () => ({ gateway: 'razorpay', reason: 'synthetic: signature mismatch' }) },

  // Compare extras
  { event: 'compare_tool_removed', mode: 'payload', run: noop, props: (s) => ({ tool_slug: s.tool, tray_count: 1 }) },
  { event: 'compare_share_clicked', mode: 'payload', run: noop, props: (s) => ({ tools: `${s.tool},chatgpt` }) },
  { event: 'compare_tray_opened', mode: 'payload', run: noop, props: () => ({ tray_count: 2 }) },

  // Plan flow (real flow triggers paid AI generation — payload-driven)
  { event: 'plan_started', mode: 'payload', note: 'real trigger runs paid AI plan generation', run: noop, props: () => ({ source: 'plan_page' }) },
  {
    event: 'plan_intake_submitted',
    mode: 'payload',
    note: 'real trigger runs paid AI plan generation',
    run: noop,
    props: () => ({
      skill_level: 'beginner',
      budget: 'under_50',
      team_size: 'solo',
      industry: 'marketing',
      goal_type: 'typed',
      goal_text: 'Automate customer support triage for a small SaaS team',
      goal_text_word_count: 9,
      existing_tools: ['chatgpt', 'zendesk'],
      existing_tools_count: 2,
      existing_tools_matched_slugs: ['chatgpt'],
      existing_tools_unmatched: ['zendesk'],
      time_to_complete_intake_ms: 42000,
      source: 'homepage',
    }),
  },
  {
    event: 'plan_chip_selected',
    mode: 'payload',
    run: noop,
    props: () => ({ step: 'budget', step_index: 1, chip_value: 'under_50', chip_label: 'Under $50/mo', chip_index: 0, multi_select_count: 1, all_selected_values: ['under_50'], time_to_select_ms: 1800 }),
  },
  {
    event: 'plan_existing_tool_added',
    mode: 'payload',
    run: noop,
    props: () => ({ tool_name: 'ChatGPT', matched_tool_slug: 'chatgpt', matched_tool_id: UUID_B, total_count: 1, source: 'autocomplete', time_to_add_ms: 2400 }),
  },
  { event: 'plan_existing_tool_removed', mode: 'payload', run: noop, props: () => ({ tool_name: 'ChatGPT', matched_tool_slug: 'chatgpt', total_count: 0 }) },
  { event: 'plan_completed', mode: 'payload', note: 'real trigger runs paid AI plan generation', run: noop, props: () => ({ use_case: 'customer support automation', tool_count: 5 }) },
  { event: 'plan_match_tier', mode: 'payload', run: noop, props: () => ({ stage_id: 'stage-1-triage', tier: 'keyword' }) },
  { event: 'plan_perf', mode: 'payload', run: noop, props: () => ({ total_ms: 5230, search_ms: 410, scoring_ms: 130 }) },
  {
    event: 'plan_results_displayed',
    mode: 'payload',
    note: 'real trigger runs paid AI plan generation',
    run: noop,
    props: (s) => ({
      recommended_tool_slugs: [s.tool, 'chatgpt', 'claude'],
      recommended_tool_ids: [UUID_A, UUID_B, UUID_C],
      recommendation_count: 3,
      stages_count: 3,
      total_estimated_cost_usd_per_month: 96,
      use_case: 'customer support automation',
      matches_existing_tools: ['chatgpt'],
      replaces_existing_tools: [],
      source_intake_id: UUID_C,
    }),
  },
  {
    event: 'plan_results_tool_clicked',
    mode: 'payload',
    run: noop,
    props: (s) => ({ tool_slug: s.tool, tool_id: UUID_A, position: 1, recommendation_tier: 'top', stage_id: 'stage-1-triage', user_intake_use_case: 'support', user_intake_skill: 'beginner', user_intake_budget: 'under_50', user_intake_team: 'solo', total_recommended_count: 3 }),
  },
  { event: 'plan_cta_dismissed', mode: 'payload', note: 'sticky bar needs scroll-state + dismissal timing — payload-driven', run: noop, props: () => ({ surface: 'sticky_bar', page_path: '/tools' }) },
  { event: 'plan_signup_modal_oauth_clicked', mode: 'payload', note: 'OAuth flow — not browser-drivable headlessly', run: noop, props: () => ({ provider: 'google' }) },
  { event: 'plan_signup_modal_skipped', mode: 'payload', note: 'skip navigates to /plan and runs paid AI generation', run: noop, props: () => ({ typed_goal_char_count: 54 }) },
  { event: 'plan_signup_modal_completed', mode: 'payload', note: 'OAuth flow — not browser-drivable headlessly', run: noop, props: () => ({ provider: 'google', was_anon_to_known: true, source_surface: 'homepage' }) },
  { event: 'recommendation_requested', mode: 'payload', run: noop, props: () => ({ use_case: 'video editing', budget: 'free', level: 'beginner' }) },

  // Search extra
  {
    event: 'search_result_clicked',
    mode: 'payload',
    note: 'autocomplete dropdown click is timing-flaky headlessly — payload-driven',
    run: noop,
    props: (s) => ({ query: 'ai video editor', tool_slug: s.tool, tool_id: UUID_A, position: 0, total_results: 6, page_number: 1 }),
  },

  // Discovery
  { event: 'filter_applied', mode: 'payload', run: noop, props: () => ({ filter_type: 'pricing', value: 'free', source: 'tools_page' }) },
  { event: 'collection_viewed', mode: 'payload', run: noop, props: () => ({ slug: 'best-free-ai-tools' }) },

  // AI chat (real chat hits paid LLM API)
  {
    event: 'ai_chat_message',
    mode: 'payload',
    note: 'real trigger hits paid LLM API',
    run: noop,
    props: () => ({ intent: null, message_text: 'What is the best AI tool for editing podcasts?', message_length: 47, message_word_count: 9, mentioned_tool_slugs: [], conversation_turn: 1, is_follow_up: false }),
  },
  {
    event: 'ai_chat_response_received',
    mode: 'payload',
    note: 'real trigger hits paid LLM API',
    run: noop,
    props: () => ({ tool_count_suggested: 3, suggested_tool_slugs: ['descript', 'adobe-podcast', 'auphonic'], response_length: 842, latency_ms: 2900 }),
  },
  {
    event: 'ai_chat_tool_clicked',
    mode: 'payload',
    note: 'real trigger hits paid LLM API',
    run: noop,
    props: () => ({ tool_slug: 'descript', position_in_response: 1, user_message_text: 'What is the best AI tool for editing podcasts?', conversation_turn: 1 }),
  },

  // Reviews (submission requires auth)
  { event: 'review_form_opened', mode: 'payload', run: noop, props: (s) => ({ tool_id: UUID_A, tool_slug: s.tool, source: 'tool_page' }) },
  { event: 'review_rating_set', mode: 'payload', run: noop, props: () => ({ tool_id: UUID_A, rating: 5, time_to_rate_ms: 3100 }) },
  { event: 'review_text_changed', mode: 'payload', run: noop, props: () => ({ tool_id: UUID_A, length: 120, word_count: 22 }) },
  {
    event: 'review_submitted',
    mode: 'payload',
    note: 'requires authenticated user',
    run: noop,
    props: (s) => ({
      tool_id: UUID_A,
      tool_slug: s.tool,
      rating: 5,
      text: 'Synthetic review: solid tool, fast onboarding, fair pricing for small teams.',
      text_length: 77,
      word_count: 12,
      pros_text: 'Fast onboarding',
      cons_text: 'Limited integrations',
      has_pros: true,
      has_cons: true,
      recommended: true,
      use_case_tag: 'content_creation',
      time_to_submit_ms: 61000,
    }),
  },

  // Auth (OAuth flows — payload-driven)
  { event: 'signup_started', mode: 'payload', note: 'auth flow', run: noop, props: () => ({ source: 'navbar' }) },
  { event: 'signup_completed', mode: 'payload', note: 'auth flow (server-authoritative shape)', run: noop, props: () => ({ method: 'google', source: 'server' }) },
  { event: 'login_completed', mode: 'payload', note: 'auth flow (server-authoritative shape)', run: noop, props: () => ({ method: 'google', source: 'server' }) },
  { event: 'password_reset_completed', mode: 'payload', note: 'auth flow', run: noop, props: () => ({ method: 'email' }) },

  // Content / growth
  { event: 'blog_internal_link_clicked', mode: 'payload', run: noop, props: (s) => ({ from_slug: 'best-ai-video-tools', to_path: `/tools/${s.tool}` }) },
  { event: 'share_clicked', mode: 'payload', run: noop, props: () => ({ entity: 'tool', entity_id: UUID_A, channel: 'twitter' }) },
  {
    event: 'newsletter_subscribed',
    mode: 'payload',
    run: noop,
    props: () => ({ source: 'footer', email_domain: 'gmail.com', page_path_at_subscribe: '/blog/best-ai-video-tools', tool_slug_context: '' }),
  },
  { event: 'activation_milestone', mode: 'payload', run: noop, props: () => ({ milestone: 'first_tool_saved', value: 1 }) },

  // Engagement depth (real heartbeat needs 30s wall time — payload-driven)
  {
    event: 'engaged_time_heartbeat',
    mode: 'payload',
    note: 'real beat needs 30s of wall time — payload-driven',
    run: noop,
    props: () => ({ path: '/tools', heartbeat_n: 1, engaged_seconds_delta: 22, engaged_seconds_total: 22 }),
  },

  // Frustration / behavior-depth signals (10.7c.2 — real triggers need
  // multi-click timing / mouse-out gestures / thrown errors, all
  // nondeterministic headlessly — payload-driven)
  {
    event: 'rage_click',
    mode: 'payload',
    note: 'real trigger needs 3 clicks <1s within 30px — payload-driven',
    run: noop,
    props: () => ({ page_path: '/tools', target_element_id: 'div.filter-panel', click_count: 4 }),
  },
  {
    event: 'dead_click',
    mode: 'payload',
    note: 'real trigger needs a 600ms no-mutation probe — payload-driven',
    run: noop,
    props: () => ({ page_path: '/tools', target_element_id: 'div.card-header' }),
  },
  {
    event: 'exit_intent',
    mode: 'payload',
    note: 'real trigger is a desktop mouse-out through viewport top — payload-driven',
    run: noop,
    props: () => ({ page_path: '/tools', seconds_on_page: 42 }),
  },
  {
    event: 'error_encountered',
    mode: 'payload',
    note: 'real trigger is a thrown error / failed resource — payload-driven',
    run: noop,
    props: () => ({
      boundary: 'window',
      message: "Synthetic: TypeError: Cannot read properties of undefined (reading 'slug')",
      error_type: 'js_error',
      source_url: 'https://rightaichoice.com/_next/static/chunks/synthetic.js',
      line: 1,
      col: 4242,
      page_path: '/tools',
    }),
  },
  {
    event: 'external_link_clicked',
    mode: 'payload',
    note: 'global anchor listener (foreign host) — payload-driven',
    run: noop,
    props: () => ({ url: 'https://example.com/pricing', entity: 'anchor', entity_id: 'a.underline' }),
  },

  // Form analytics (10.7c.3 — focus/blur cycles and native submits are
  // nondeterministic headlessly — payload-driven)
  {
    event: 'form_field_changed',
    mode: 'payload',
    note: 'real trigger is a blur-with-changed-value — payload-driven',
    run: noop,
    props: () => ({
      form_id: 'newsletter_inline',
      field_name: 'email',
      field_type: 'email',
      has_value: true,
      value_length: 19,
      page_path: '/blog/best-ai-video-tools',
      focus_order: 1,
      corrections: 0,
    }),
  },
  {
    event: 'form_submitted',
    mode: 'payload',
    note: 'real trigger is a native form submit — payload-driven',
    run: noop,
    props: () => ({
      form_id: 'review',
      all_field_names_filled: ['text', 'pros', 'cons'],
      field_count_filled: 3,
      field_count_skipped: 1,
      time_to_submit_ms: 48_000,
    }),
  },
  {
    event: 'form_validation_failed',
    mode: 'payload',
    note: 'real trigger is native constraint validation — payload-driven',
    run: noop,
    props: () => ({ form_id: 'auth_signup', field_name: 'email', error_code: 'typeMismatch' }),
  },
  {
    event: 'form_abandoned',
    mode: 'payload',
    note: 'real trigger is leaving a touched form — payload-driven',
    run: noop,
    props: () => ({
      form_id: 'auth_signup',
      page_path: '/signup',
      last_field_name: 'password',
      fields_touched: 2,
      corrections_total: 1,
      seconds_on_form: 35,
      focus_order: ['email', 'password'],
    }),
  },

  // System / performance (browser flush is hide/route-change-timed —
  // canonical payload keeps the suite deterministic; the tracker itself is
  // dev-validated at the capture() choke point)
  {
    event: 'web_vitals',
    mode: 'payload',
    note: 'flush timing (visibility/pagehide) is nondeterministic headlessly — payload-driven',
    run: noop,
    props: () => ({ path: '/', lcp_ms: 1840, fcp_ms: 920, ttfb_ms: 240, cls: 0.02, metric_count: 4, slow_page: false }),
  },

  // Dashboard / profile / saved (require auth)
  { event: 'dashboard_viewed', mode: 'payload', note: 'requires authenticated user', run: noop, props: () => ({ has_saves: true, saves_count: 4, has_plans: true }) },
  { event: 'saved_list_viewed', mode: 'payload', note: 'requires authenticated user', run: noop, props: () => ({ count: 4 }) },
  { event: 'profile_viewed', mode: 'payload', run: noop, props: () => ({ username: 'synthetic-user', is_own_profile: false }) },

  // Stacks
  {
    event: 'stack_saved',
    mode: 'payload',
    note: 'requires authenticated user + plan flow',
    run: noop,
    props: (s) => ({
      stack_slug: 'support-starter-stack',
      stack_name: 'Support starter stack',
      tool_slugs: [s.tool, 'chatgpt'],
      tool_ids: [UUID_A, UUID_B],
      tool_count: 2,
      total_estimated_cost_usd: 40,
      source: 'plan_flow',
    }),
  },
]

// ── Dedup probe ──────────────────────────────────────────────────────
async function runDedupProbe(slugs: Slugs): Promise<void> {
  console.log('\nDedup probe — 3 events double-fired with deterministic insert_ids:')
  const probes: Array<{ event: string; props: Record<string, unknown> }> = [
    { event: 'nav_cta_clicked', props: { cta: 'dedup_probe', source: 'navbar' } },
    { event: 'tool_saved', props: { tool_id: UUID_A, tool_name: 'Dedup Probe', tool_slug: slugs.tool } },
    { event: 'filter_applied', props: { filter_type: 'pricing', value: 'free', source: 'dedup_probe' } },
  ]
  for (let i = 0; i < probes.length; i++) {
    dedupTotal++
    const { event, props } = probes[i]
    const distinctId = `${RUNID}-d${i + 1}`
    const insertId = `${RUNID}-dedup-${i + 1}`
    const ev = buildMirrorEvent(event, props, distinctId, { insert_id: insertId })
    await postMirror([ev])
    await postMirror([{ ...ev, client_time_ms: Date.now() }]) // same insert_id, fired twice
    await sleep(1200)
    const { count, error } = await db
      .from('user_events')
      .select('id', { count: 'exact', head: true })
      .eq('distinct_id', distinctId)
      .eq('event_name', event)
    const ok = !error && count === 1
    if (ok) dedupPassed++
    console.log(`${ok ? '  ✓' : '  ✗'} ${event} fired 2× with insert_id=${insertId} → ${count ?? '?'} row(s)${error ? ' — ' + error.message : ''}`)
  }
}

// ── Channel probes (10.7a) ───────────────────────────────────────────
// Prove the channel classification lands end-to-end, both halves:
//   browser — a REAL navigation to /?utm_source=test&utm_medium=cpc&
//     gclid=test123 arriving from a fake facebook.com referrer (puppeteer
//     referer). mirrorContext must stamp traffic_channel='paid' (gclid wins
//     the precedence) + traffic_source='google_ads' + the gclid itself, and
//     the top-level utm columns must land.
//   payload — a canonical page_viewed posted with the traffic_* keys a
//     client arriving from chatgpt.com would carry (computed via the SAME
//     classifier), proving ingest stores envelope channel keys untagged.
// (The keys are namespaced traffic_* because `channel` is a real payload
// property of share_clicked — the very first full run of these probes
// caught the collision.)
async function runChannelBrowserProbe(browser: Browser): Promise<void> {
  console.log('\nChannel probe (browser) — paid click-id from a fake facebook referrer:')
  const distinctId = `${RUNID}-ch`
  const page = await newJourneyPage(browser, distinctId)
  try {
    await page.goto(`${BASE_URL}/?utm_source=test&utm_medium=cpc&gclid=test123`, {
      waitUntil: 'domcontentloaded',
      referer: 'https://www.facebook.com/',
    })
    await page.waitForSelector('body')
    await sleep(2500)
    await verifySeededDistinctId(page, distinctId)
  } finally {
    await flushJourney(page)
  }
  const deadline = Date.now() + 21_000
  let rows: UserEventRow[] = []
  while (Date.now() < deadline) {
    rows = await fetchRows(distinctId, 'page_viewed')
    if (rows.length > 0) break
    await sleep(1500)
  }
  const issues: string[] = []
  if (rows.length === 0) {
    issues.push(`no page_viewed row for ${distinctId}`)
  } else {
    const props = (rows[0].properties ?? {}) as Record<string, unknown>
    if (props.traffic_channel !== 'paid') issues.push(`traffic_channel=${JSON.stringify(props.traffic_channel)} (expected 'paid')`)
    if (props.traffic_source !== 'google_ads') issues.push(`traffic_source=${JSON.stringify(props.traffic_source)} (expected 'google_ads' — gclid wins precedence)`)
    if (props.gclid !== 'test123') issues.push(`gclid=${JSON.stringify(props.gclid)} (expected 'test123')`)
    if (props.schema_valid === false) issues.push(`row tagged schema_valid=false: ${JSON.stringify(props.schema_issues ?? [])}`)
  }
  // Top-level utm columns must land too (separate select — fetchRows
  // doesn't pull them).
  if (rows.length > 0) {
    const { data } = await db
      .from('user_events')
      .select('utm_source, utm_medium, referrer')
      .eq('distinct_id', distinctId)
      .eq('event_name', 'page_viewed')
      .limit(1)
    const row = (data?.[0] ?? null) as { utm_source: string | null; utm_medium: string | null; referrer: string | null } | null
    if (row?.utm_source !== 'test') issues.push(`utm_source column=${JSON.stringify(row?.utm_source)} (expected 'test')`)
    if (row?.utm_medium !== 'cpc') issues.push(`utm_medium column=${JSON.stringify(row?.utm_medium)} (expected 'cpc')`)
  }
  channelBrowserPassed = issues.length === 0
  console.log(`${channelBrowserPassed ? '  ✓' : '  ✗'} paid navigation${channelBrowserPassed ? ' — traffic_channel=paid, traffic_source=google_ads, gclid + utm columns landed' : ' — ' + issues.join(' | ')}`)
}

async function runChannelPayloadProbe(): Promise<void> {
  console.log('\nChannel probe (payload) — AI referrer (chatgpt.com):')
  const distinctId = `${RUNID}-chp`
  const expected = classifyChannel('chatgpt.com')
  const ev = buildMirrorEvent(
    'page_viewed',
    {
      path: '/',
      url: `${BASE_URL}/`,
      referrer: 'https://chatgpt.com/',
      traffic_channel: expected.channel,
      traffic_source: expected.source,
    },
    distinctId,
    { referrer: 'https://chatgpt.com/', page_path: '/' },
  )
  await postMirror([ev])
  const deadline = Date.now() + 15_000
  let rows: UserEventRow[] = []
  while (Date.now() < deadline) {
    rows = await fetchRows(distinctId, 'page_viewed')
    if (rows.length > 0) break
    await sleep(1200)
  }
  const issues: string[] = []
  if (expected.channel !== 'ai') issues.push(`classifier says ${expected.channel} for chatgpt.com (expected 'ai')`)
  if (rows.length === 0) {
    issues.push(`no row for ${distinctId}`)
  } else {
    const props = (rows[0].properties ?? {}) as Record<string, unknown>
    if (props.traffic_channel !== 'ai') issues.push(`stored traffic_channel=${JSON.stringify(props.traffic_channel)} (expected 'ai')`)
    if (props.traffic_source !== 'chatgpt') issues.push(`stored traffic_source=${JSON.stringify(props.traffic_source)} (expected 'chatgpt')`)
    if (props.schema_valid === false) issues.push(`row tagged schema_valid=false: ${JSON.stringify(props.schema_issues ?? [])}`)
  }
  channelPayloadPassed = issues.length === 0
  console.log(`${channelPayloadPassed ? '  ✓' : '  ✗'} ai payload${channelPayloadPassed ? ' — traffic_channel=ai/chatgpt stored untagged' : ' — ' + issues.join(' | ')}`)
}

// ── Negative test (tag-don't-drop) ───────────────────────────────────
async function runNegativeTest(): Promise<void> {
  console.log('\nNegative test — deliberately malformed payload (page_viewed with numeric path):')
  const distinctId = `${RUNID}-neg`
  // Wrong type for a required prop: path must be a string.
  const bad = buildMirrorEvent('page_viewed', { path: 123, url: 42, referrer: '' }, distinctId)
  await postMirror([bad])
  const deadline = Date.now() + 15_000
  let row: UserEventRow | null = null
  while (Date.now() < deadline) {
    const rows = await fetchRows(distinctId, 'page_viewed')
    if (rows.length > 0) { row = rows[0]; break }
    await sleep(1200)
  }
  const props = (row?.properties ?? {}) as Record<string, unknown>
  const landed = !!row
  const tagged = props.schema_valid === false && Array.isArray(props.schema_issues) && props.schema_issues.length > 0
  negativePassed = landed && tagged
  console.log(`${negativePassed ? '  ✓' : '  ✗'} row ${landed ? 'landed' : 'MISSING'}; schema_valid=${String(props.schema_valid)}; issues=${JSON.stringify(props.schema_issues ?? null)}`)
}

// ── Cleanup ──────────────────────────────────────────────────────────
async function cleanup(): Promise<{ remaining: number }> {
  const pattern = `${RUNID}%`
  await db.from('user_events').delete().like('distinct_id', pattern)
  await db.from('user_intent_profile').delete().like('distinct_id', pattern)
  const { count } = await db
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .like('distinct_id', pattern)
  return { remaining: count ?? -1 }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const t0 = Date.now()
  console.log(`Synthetic event suite — runid: ${RUNID}`)
  console.log(`Base URL: ${BASE_URL}  mode: ${MODE}${ONLY_EVENT ? `  event: ${ONLY_EVENT}` : ''}${KEEP ? '  (--keep)' : ''}\n`)

  // Recipe-table completeness: exactly one recipe per EVENT_SCHEMAS key.
  const recipeEvents = RECIPES.map((r) => r.event as string)
  const recipeSet = new Set(recipeEvents)
  const missing = SCHEMA_EVENT_NAMES.filter((e) => !recipeSet.has(e))
  const extra = recipeEvents.filter((e) => !SCHEMA_EVENT_NAMES.includes(e))
  const dupes = recipeEvents.filter((e, i) => recipeEvents.indexOf(e) !== i)
  if (missing.length || extra.length || dupes.length) {
    console.error(`Recipe table drift — missing: [${missing.join(', ')}] extra: [${extra.join(', ')}] dupes: [${dupes.join(', ')}]`)
    process.exit(2)
  }
  if (ONLY_EVENT && !recipeSet.has(ONLY_EVENT)) {
    console.error(`--event=${ONLY_EVENT} is not a known FIRED event`)
    process.exit(2)
  }
  console.log(`Recipe table: ${RECIPES.length} events (${RECIPES.filter((r) => r.mode === 'browser').length} browser / ${RECIPES.filter((r) => r.mode === 'payload').length} payload)\n`)

  await ensureServer()
  const slugs = await discoverSlugs()
  console.log(`Live slugs — tool: ${slugs.tool}  category: ${slugs.category}  compare: ${slugs.compare}\n`)

  let browser: Browser | null = null
  try {
    // ── Browser journeys ─────────────────────────────────────────
    const wantBrowser = MODE !== 'payload'
    const browserRecipes = RECIPES.filter((r) => r.mode === 'browser')
    const onlyRecipe = ONLY_EVENT ? RECIPES.find((r) => r.event === ONLY_EVENT)! : null
    if (wantBrowser && (!onlyRecipe || onlyRecipe.mode === 'browser')) {
      // Pre-warm dev-server compiles so navigation timeouts don't eat the run.
      for (const url of ['/', '/tools', `/tools/${slugs.tool}`, `/tools/${slugs.tool}/sentiment`, `/categories/${slugs.category}`, `/compare/${slugs.compare}`]) {
        await fetch(`${BASE_URL}${url}`).catch(() => {})
      }
      browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const journeys = onlyRecipe?.journey ? [onlyRecipe.journey] : ([1, 2] as const)
      for (const j of journeys) {
        const distinctId = `${RUNID}-b${j}`
        const steps = browserRecipes.filter((r) => r.journey === j)
        console.log(`Journey ${j} (${distinctId}) — ${steps.length} browser steps:`)
        const page = await newJourneyPage(browser, distinctId)
        const ctx: BrowserCtx = { page, baseUrl: BASE_URL, distinctId, slugs }
        const actionErrors = new Map<string, string>()
        for (const step of steps) {
          try {
            await step.run(ctx)
            console.log(`  · action ok: ${step.event}`)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            actionErrors.set(step.event, msg)
            console.log(`  · action FAILED: ${step.event} — ${msg}`)
          }
        }
        await flushJourney(page)
        // Assertions for this journey's events.
        for (const step of steps) {
          if (onlyRecipe && step.event !== onlyRecipe.event) continue
          const pre = actionErrors.get(step.event)
          await assertEvent(step.event, 'browser', distinctId, pre ? `${step.note ?? ''} action-error: ${pre}`.trim() : step.note)
        }
      }
      // 10.7a — channel browser probe (full runs only, reuses the browser).
      if (!ONLY_EVENT && MODE === 'all') await runChannelBrowserProbe(browser)
      await browser.close()
      browser = null
    }

    // ── Payload recipes ──────────────────────────────────────────
    const wantPayload = MODE !== 'browser'
    if (wantPayload && (!onlyRecipe || onlyRecipe.mode === 'payload')) {
      console.log('\nPayload recipes (POST /api/track-mirror):')
      for (const r of RECIPES.filter((x) => x.mode === 'payload')) {
        if (onlyRecipe && r.event !== onlyRecipe.event) continue
        try {
          const distinctId = await firePayload(r.event, r.props!(slugs))
          const note = SERVER_ONLY_EVENTS.has(r.event) ? (r.note ?? 'server-only') : r.note
          await assertEvent(r.event, 'payload', distinctId, note)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          results.push({ event: r.event, mode: 'payload', ok: false, ms: 0, distinct_id: '(send failed)', note: r.note, error: msg })
          console.log(`  ✗ [payload] ${r.event} — ${msg}`)
        }
      }
    }

    // ── Dedup + negative + channel payload probe ─────────────────
    if (!ONLY_EVENT && MODE !== 'browser') await runDedupProbe(slugs)
    if (!ONLY_EVENT && MODE === 'all') await runNegativeTest()
    if (!ONLY_EVENT && MODE === 'all') await runChannelPayloadProbe()
  } finally {
    if (browser) await browser.close().catch(() => {})
  }

  // ── Report ───────────────────────────────────────────────────────
  const durationMs = Date.now() - t0
  const passed = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  const browserCount = results.filter((r) => r.mode === 'browser').length
  const payloadCount = results.filter((r) => r.mode === 'payload').length

  console.log('\n──────────────── Coverage report ────────────────')
  console.log(`Events verified: ${passed.length}/${results.length} (target ${SCHEMA_EVENT_NAMES.length})`)
  console.log(`Browser: ${browserCount}  Payload: ${payloadCount}`)
  if (dedupTotal > 0) console.log(`Dedup probe: ${dedupPassed}/${dedupTotal}`)
  if (negativePassed !== null) console.log(`Negative test (tag-don't-drop): ${negativePassed ? 'PASS' : 'FAIL'}`)
  if (channelBrowserPassed !== null) console.log(`Channel probe (browser, paid): ${channelBrowserPassed ? 'PASS' : 'FAIL'}`)
  if (channelPayloadPassed !== null) console.log(`Channel probe (payload, ai): ${channelPayloadPassed ? 'PASS' : 'FAIL'}`)
  console.log(`Runtime: ${(durationMs / 1000).toFixed(1)}s`)
  if (failed.length > 0) {
    console.log('\nFailures:')
    for (const f of failed) console.log(`  ✗ ${f.event} [${f.mode}] — ${f.error}`)
  }

  const fullRun = !ONLY_EVENT && MODE === 'all'
  const coverage = {
    generated_at: new Date().toISOString(),
    runid: RUNID,
    base_url: BASE_URL,
    mode: MODE,
    partial: !fullRun,
    summary: {
      total_fired_events: SCHEMA_EVENT_NAMES.length,
      verified: passed.length,
      failed: failed.length,
      browser: browserCount,
      payload: payloadCount,
      dedup: `${dedupPassed}/${dedupTotal}`,
      negative_test: negativePassed === null ? 'skipped' : negativePassed ? 'pass' : 'fail',
      channel_probe_browser: channelBrowserPassed === null ? 'skipped' : channelBrowserPassed ? 'pass' : 'fail',
      channel_probe_payload: channelPayloadPassed === null ? 'skipped' : channelPayloadPassed ? 'pass' : 'fail',
      duration_ms: durationMs,
    },
    events: results.map((r) => ({
      event: r.event,
      mode: r.mode,
      pass: r.ok,
      ms: r.ms,
      ...(r.note ? { note: r.note } : {}),
      ...(r.error ? { error: r.error } : {}),
    })),
  }
  const outPath = path.join(process.cwd(), 'docs/admin/synthetic-coverage.json')
  fs.writeFileSync(outPath, JSON.stringify(coverage, null, 2) + '\n')
  console.log(`\nCoverage written to ${path.relative(process.cwd(), outPath)}${coverage.partial ? ' (partial run)' : ''}`)

  // ── Cleanup ──────────────────────────────────────────────────────
  if (KEEP) {
    console.log(`--keep: leaving rows with distinct_id LIKE '${RUNID}%' in user_events`)
  } else {
    const { remaining } = await cleanup()
    console.log(`Cleanup: deleted user_events + user_intent_profile rows LIKE '${RUNID}%' — ${remaining === 0 ? 'verified 0 rows remain' : `WARNING: ${remaining} rows remain`}`)
  }

  const suiteGreen =
    failed.length === 0 &&
    (!fullRun ||
      (passed.length === SCHEMA_EVENT_NAMES.length &&
        dedupPassed === dedupTotal && dedupTotal === 3 &&
        negativePassed === true &&
        channelBrowserPassed === true &&
        channelPayloadPassed === true))
  console.log(`\n${suiteGreen ? '✓ SUITE GREEN' : '✗ SUITE FAILED'}`)
  stopServer()
  process.exit(suiteGreen ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  stopServer()
  process.exit(2)
})
