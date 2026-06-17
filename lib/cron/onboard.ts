/**
 * Fast new-tool onboard orchestrator (Phase 9 — Workstream B).
 *
 * A freshly-inserted tool (from lib/cron/ingest.ts) has only its raw
 * enrichment fields and NULL freshness columns. The stalest-first nightly
 * pipelines (refresh / viability / latest-updates) WILL eventually reach it —
 * and because inserts now leave those columns NULL, it sorts to the FRONT of
 * each queue (anti-starvation). But "eventually" can still be many hours away
 * depending on batch sizes. This orchestrator closes that gap: it runs every
 * ~30 min, takes the oldest few tools with `onboarded_at IS NULL`, and drives
 * the SAME per-tool steps the nightly jobs use to completion — so a new tool
 * reaches parity in hours, not the 24h batch cycle.
 *
 * REUSE OVER REBUILD — every step calls an existing function:
 *   1. refresh        → runRefreshForSlugs()           (lib/cron/refresh.ts)
 *   2. categorize     → DeepSeek category prediction    (same pattern as
 *                       scripts/scale-catalog.ts predictCategories — that one
 *                       is script-private, so the small prediction call is
 *                       reproduced here rather than refactoring the script)
 *   3. viability      → calculateSignals + computeViabilityScore
 *                       (lib/cron/viability.ts)
 *   4. latest-updates → changelog/blog/news/HN/Reddit scrapers +
 *                       synthesizeLatestUpdates (lib/cron/latest-updates.ts —
 *                       same body as the /api/cron/refresh-latest-updates
 *                       route's processOne)
 *
 * PHASE 9 D2 — GATED PREMIUM SOP (this file now extends A4's fast onboard):
 * the premium steps A4 deferred are implemented here and run on DRAFT tools so
 * a new tool reaches the standard of our best pages BEFORE it publishes:
 *   5. logo            → resolveAndStoreLogo()   (lib/cron/logo.ts, shared with
 *                        scripts/backfill-logos.ts). SOFT gate (favicon ok).
 *   6. alternatives    → resolveAlternatives()   (live category-sibling rank,
 *                        same signal getAlternativeTools uses). HARD gate ≥3.
 *   7. editorial cmprs → createEditorialCompares() (2-4 is_editorial rows vs
 *                        top alts + inline prose). HARD gate ≥2.
 *   8. FAQs            → generateLongTailFaqs()   (≥9 faqs_long_tail). HARD.
 *   9. sentiment       → scrapeAllSources+synthesizeReport→tool_sentiment_cache.
 *                        SOFT gate (heavy/async — warn, never block).
 *  10. QA gate + publish→ evaluate every gate, write tool_onboarding_qa, and
 *                        flip is_published=true ONLY when all HARD gates pass,
 *                        then submitToIndexNow() (invoke only).
 *
 * Each step is independently try/caught: one failing step never aborts the
 * others, and we record which succeeded. Two entry points:
 *   - onboardPendingTools()  → A4's original fast lane for PUBLISHED tools
 *     (onboarded_at IS NULL). Unchanged behaviour: it does NOT unpublish, and
 *     publish-on-green is a no-op for an already-published row.
 *   - runOnboardSop(slug)    → the D2 draft lane: full gated SOP on a single
 *     DRAFT (is_published=false) tool; publishes on all-green.
 * Both share onboardOne() so the quality bar is identical.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminClient } from './supabase-admin'
import { runRefreshForSlugs } from './refresh'
import { calculateSignals, computeViabilityScore, type ViabilitySignals } from './viability'
import { discoverChangelog, discoverBlog } from './scrape-changelog'
import { fetchNewsMentions } from './scrape-news'
import { searchHN } from './scrape-hn'
import { searchReddit } from './scrape-reddit'
import { synthesizeLatestUpdates, type SignalInput } from './latest-updates'
import type { EnrichedToolData } from './enrich'
// Phase 9 D2 — gated SOP premium steps (reuse over rebuild).
import { resolveAndStoreLogo } from './logo'
import { generateLongTailFaqs } from './onboard-faqs'
import {
  resolveAlternatives,
  createEditorialCompares,
  countEditorialCompares,
} from './onboard-compares'
import { assignTags, loadValidTagSlugs } from './onboard-tags'
import { scrapeAllSources } from '@/lib/scrapers'
import { synthesizeReport } from '@/lib/ai/synthesize-report'
import { submitToIndexNow } from '@/lib/indexnow'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_CATEGORY_MODEL = 'deepseek-chat'

type PendingTool = {
  id: string
  slug: string
  name: string
  website_url: string | null
  changelog_url: string | null
  blog_url: string | null
  logo_url: string | null
  // viability inputs
  is_wrapper: boolean
  github_url: string | null
  github_stars: number | null
  pricing_type: string
  created_at: string
  // categorization inputs (enrichment output already on the row)
  tagline: string | null
  description: string | null
  features: string[] | null
  best_for: string[] | null
  onboard_attempts: number | null
}

// Columns the SELECT pulls for every onboard candidate (used by both lanes).
const ONBOARD_SELECT =
  'id, slug, name, website_url, changelog_url, blog_url, logo_url, is_wrapper, github_url, github_stars, pricing_type, created_at, tagline, description, features, best_for, onboard_attempts'

// ── Gate model (Phase 9 D2) ────────────────────────────────────────────────
export type GateStatus = 'pass' | 'warn' | 'fail'
export type GateCheck = { status: GateStatus; detail: string }
// Each entry is keyed by step name; `kind` marks hard (blocks publish) vs soft.
export type QaChecks = Record<string, GateCheck>

export type OnboardStepResult = {
  slug: string
  refreshed: boolean
  categorized: number // count of categories assigned
  tags: number // count of tags assigned
  viability: boolean
  latestUpdates: boolean
  logo: GateStatus
  alternatives: number
  editorialCompares: number
  faqs: number
  sentiment: GateStatus
  checks: QaChecks
  allGreen: boolean
  published: boolean
  errors: string[]
  onboarded: boolean
}

export type OnboardResult = {
  runId: string
  processed: number
  onboarded: number
  published: number
  results: OnboardStepResult[]
}

// HARD gates block publish; SOFT gates only warn. Used both to evaluate and to
// surface the classification at /admin/onboarding.
const HARD_GATES = new Set([
  'description',
  'features',
  'pricing_type',
  'categories',
  'alternatives',
  'editorial_compares',
  'faqs',
  'editorial_fields', // best_for + not_for + editorial_verdict present
])
const SOFT_GATES = new Set(['logo', 'sentiment', 'tutorials', 'models', 'latest_updates', 'tags'])

const VALID_PRICING = new Set(['free', 'freemium', 'paid', 'contact'])

// Phase 10 #66 — stop re-running the full paid SOP forever on a tool that keeps
// failing. After this many unsuccessful attempts the lanes skip it (draft-stuck
// alert surfaces any draft that never published).
const MAX_ONBOARD_ATTEMPTS = 6

/** Upsert the per-tool QA record. */
async function writeQaRecord(
  supabase: SupabaseClient,
  toolId: string,
  checks: QaChecks,
  allGreen: boolean,
  published: boolean,
): Promise<void> {
  const { error } = await supabase.from('tool_onboarding_qa').upsert(
    {
      tool_id: toolId,
      checks,
      all_green: allGreen,
      published,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'tool_id' },
  )
  if (error) console.error(`[onboard] QA upsert failed for ${toolId}: ${error.message}`)
}

/** True only when every HARD gate is 'pass'. SOFT 'warn' does not block. */
function isAllGreen(checks: QaChecks): boolean {
  for (const [step, check] of Object.entries(checks)) {
    if (HARD_GATES.has(step) && check.status !== 'pass') return false
  }
  return true
}

// ── Step 2 helper: category prediction (same DeepSeek call shape as
// scripts/scale-catalog.ts predictCategories; reproduced because that one is
// not exported from a library module). Returns valid slugs only.
async function predictCategories(
  name: string,
  enriched: Pick<EnrichedToolData, 'tagline' | 'description' | 'features' | 'best_for'>,
  validSlugs: string[],
): Promise<string[]> {
  if (!process.env.DEEPSEEK_API_KEY) return []
  const prompt = `Pick 1-3 category slugs for this AI tool. Return ONLY slugs from the provided list — never invent.

Tool: ${name}
Tagline: ${enriched.tagline ?? ''}
Description: ${(enriched.description ?? '').slice(0, 800)}
Features: ${(enriched.features ?? []).slice(0, 8).join(', ')}
Best for: ${(enriched.best_for ?? []).slice(0, 5).join(', ')}

Valid category slugs (pick from these only):
${validSlugs.join(', ')}

Return JSON: {"slugs": ["slug-1", "slug-2"]}`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_CATEGORY_MODEL,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You assign categories to AI tools. Reply with strict JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = json.choices[0]?.message?.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []
  const parsed = JSON.parse(match[0]) as { slugs?: unknown }
  const slugs = Array.isArray(parsed.slugs) ? parsed.slugs : []
  return slugs.filter((s): s is string => typeof s === 'string' && validSlugs.includes(s)).slice(0, 3)
}

async function categorizeTool(
  supabase: SupabaseClient,
  tool: PendingTool,
  validSlugs: string[],
): Promise<number> {
  // Idempotent: skip if the tool already has categories (e.g. a partial prior run).
  const { data: existing } = await supabase
    .from('tool_categories')
    .select('category_id')
    .eq('tool_id', tool.id)
    .limit(1)
  if (existing && existing.length > 0) return existing.length

  const cats = await predictCategories(
    tool.name,
    {
      tagline: tool.tagline ?? '',
      description: tool.description ?? '',
      features: tool.features ?? [],
      best_for: tool.best_for ?? [],
    },
    validSlugs,
  )
  if (cats.length === 0) return 0

  // Resolve slugs → category ids, then insert join rows (ON CONFLICT no-op).
  const { data: catRows } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', cats)
  const ids = ((catRows ?? []) as { id: string; slug: string }[]).map((c) => c.id)
  if (ids.length === 0) return 0

  const { error } = await supabase
    .from('tool_categories')
    .upsert(
      ids.map((category_id) => ({ tool_id: tool.id, category_id })) as never,
      { onConflict: 'tool_id,category_id', ignoreDuplicates: true },
    )
  if (error) throw new Error(`tool_categories: ${error.message}`)
  return ids.length
}

// ── Step 3 helper: single-tool viability (mirrors calculateViabilityBatch's
// per-tool write, reusing calculateSignals + computeViabilityScore).
async function scoreViability(supabase: SupabaseClient, tool: PendingTool): Promise<void> {
  const signals: ViabilitySignals = calculateSignals({
    id: tool.id,
    slug: tool.slug,
    is_wrapper: tool.is_wrapper,
    github_url: tool.github_url,
    github_stars: tool.github_stars,
    pricing_type: tool.pricing_type,
    website_url: tool.website_url,
    created_at: tool.created_at,
  })
  const score = computeViabilityScore(signals)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tools')
    .update({
      viability_score: score,
      viability_signals: signals,
      viability_updated_at: new Date().toISOString(),
    })
    .eq('id', tool.id)
  if (error) throw new Error(`viability: ${error.message}`)
}

// ── Step 4 helper: single-tool latest-updates (same body as the
// /api/cron/refresh-latest-updates route's processOne).
async function refreshLatestUpdates(supabase: SupabaseClient, tool: PendingTool): Promise<boolean> {
  const [changelog, blog] = await Promise.all([
    discoverChangelog(tool.website_url, tool.changelog_url).catch(() => null),
    discoverBlog(tool.website_url, tool.blog_url).catch(() => null),
  ])
  const [news, hn, reddit] = await Promise.all([
    fetchNewsMentions(tool.name, 8).catch(() => []),
    searchHN(tool.name, 30).catch(() => []),
    searchReddit(tool.name, 5, 30).catch(() => []),
  ])
  const signal: SignalInput = {
    changelog_text: changelog?.text,
    changelog_url: changelog?.url,
    blog_text: blog?.text,
    blog_url: blog?.url,
    news,
    hn,
    reddit: reddit.map((r) => ({
      title: r.title,
      url: r.permalink,
      subreddit: r.subreddit,
      score: r.score,
      created_utc: r.created_utc,
    })),
  }
  const result = await synthesizeLatestUpdates(tool.name, signal)
  if (!result) return false

  const updates: Record<string, unknown> = {
    latest_updates: result.items,
    latest_updates_at: new Date().toISOString(),
  }
  if (changelog?.url && changelog.url !== tool.changelog_url) updates.changelog_url = changelog.url
  if (blog?.url && blog.url !== tool.blog_url) updates.blog_url = blog.url

  const { error } = await supabase.from('tools').update(updates as never).eq('id', tool.id)
  if (error) throw new Error(`latest_updates: ${error.message}`)
  return true
}

// ── Step 9 helper: best-effort sentiment (heavy/async). SOFT gate — a failure
// here never blocks publish. Mirrors the /api/cron/scrape-sentiment writer.
async function refreshSentiment(supabase: SupabaseClient, tool: PendingTool): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  await sb
    .from('tool_sentiment_cache')
    .upsert(
      { tool_id: tool.id, status: 'generating', scraped_at: new Date().toISOString() },
      { onConflict: 'tool_id' },
    )
  const scrape = await scrapeAllSources(tool.name, { website: tool.website_url })
  const report = await synthesizeReport(
    {
      name: tool.name,
      tagline: tool.tagline ?? '',
      description: tool.description ?? '',
      pricing_type: tool.pricing_type,
      pricing_details: null,
      skill_level: 'beginner',
      features: tool.features ?? undefined,
    },
    scrape,
  )
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await sb.from('tool_sentiment_cache').upsert(
    {
      tool_id: tool.id,
      ai_verdict: report.ai_verdict,
      pros: report.pros,
      cons: report.cons,
      sentiment_score: report.sentiment_score,
      sentiment_breakdown: report.sentiment_breakdown,
      themes: report.themes,
      best_for: report.best_for,
      not_for: report.not_for,
      pricing_analysis: report.pricing_analysis,
      community_buzz: report.community_buzz,
      learning_curve: report.learning_curve,
      integration_insights: report.integration_insights,
      raw_reddit: scrape.reddit.posts,
      raw_twitter: scrape.twitter.posts,
      raw_quora: scrape.quora.posts,
      raw_g2: scrape.g2.posts,
      mention_count: scrape.totalPosts,
      sources_scraped: scrape.sourcesSucceeded,
      status: 'ready',
      scraped_at: now,
      synthesized_at: now,
      expires_at: expiresAt,
    },
    { onConflict: 'tool_id' },
  )
  return true
}

/**
 * Re-fetch the post-refresh state of the tool's gate-relevant columns. Refresh
 * (step 1) overwrites description/features/best_for/not_for/editorial_verdict,
 * so the gate must read the FRESH row, not the pre-refresh PendingTool.
 */
async function fetchGateRow(supabase: SupabaseClient, toolId: string) {
  const { data } = await supabase
    .from('tools')
    .select(
      'id, description, features, pricing_type, best_for, not_for, editorial_verdict, logo_url, tutorial_urls, models, latest_updates, faqs_long_tail',
    )
    .eq('id', toolId)
    .single()
  return data as
    | {
        id: string
        description: string | null
        features: string[] | null
        pricing_type: string | null
        best_for: string[] | null
        not_for: string[] | null
        editorial_verdict: string | null
        logo_url: string | null
        tutorial_urls: string[] | null
        models: string[] | null
        latest_updates: unknown[] | null
        faqs_long_tail: unknown[] | null
      }
    | null
}

/**
 * The shared per-tool SOP body. `isDraft=true` runs the premium gated lane on a
 * is_published=false tool and publishes on all-green; `isDraft=false` is A4's
 * fast lane on already-published tools (publish-on-green is then a no-op).
 */
async function onboardOne(
  supabase: SupabaseClient,
  tool: PendingTool,
  validSlugs: string[],
  validTagSlugs: string[],
  isDraft: boolean,
): Promise<OnboardStepResult> {
  const res: OnboardStepResult = {
    slug: tool.slug,
    refreshed: false,
    categorized: 0,
    tags: 0,
    viability: false,
    latestUpdates: false,
    logo: 'fail',
    alternatives: 0,
    editorialCompares: 0,
    faqs: 0,
    sentiment: 'warn',
    checks: {},
    allGreen: false,
    published: false,
    errors: [],
    onboarded: false,
  }

  // Step 1 — REFRESH (the core gate): re-scrapes the vendor site and writes the
  // SEO editorial fields + github_stars + last_verified_at. Reuses the exact
  // single-slug path the nightly refresh uses. For drafts, allow unpublished.
  try {
    const r = await runRefreshForSlugs(supabase, [tool.slug], { includeUnpublished: isDraft })
    res.refreshed = r.refreshed > 0
    if (r.refreshed === 0) res.errors.push('refresh: tool produced no update')
  } catch (e) {
    res.errors.push(`refresh: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 2 — CATEGORIZE (ingest never assigns categories; do it now).
  try {
    res.categorized = await categorizeTool(supabase, tool, validSlugs)
  } catch (e) {
    res.errors.push(`categorize: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 2b — TAGS (controlled 31-slug vocab). Powers the alternatives ranker,
  // Topics sidebar, and search relevance. SOFT — improves quality, never blocks
  // publish. Reads the post-refresh description/features.
  try {
    const gr = await fetchGateRow(supabase, tool.id)
    res.tags = await assignTags(
      supabase,
      {
        id: tool.id,
        name: tool.name,
        tagline: tool.tagline,
        description: gr?.description ?? tool.description,
        features: gr?.features ?? tool.features,
      },
      validTagSlugs,
    )
  } catch (e) {
    res.errors.push(`tags: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 3 — VIABILITY.
  try {
    await scoreViability(supabase, tool)
    res.viability = true
  } catch (e) {
    res.errors.push(`viability: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 4 — LATEST-UPDATES.
  try {
    res.latestUpdates = await refreshLatestUpdates(supabase, tool)
  } catch (e) {
    res.errors.push(`latest_updates: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 5 — LOGO (shared with backfill-logos). SOFT gate: a real bucket logo
  // is a pass; favicon fallback (skip) is a soft-pass warn.
  try {
    const logo = await resolveAndStoreLogo(supabase, {
      id: tool.id,
      slug: tool.slug,
      website_url: tool.website_url,
      logo_url: tool.logo_url,
    })
    res.logo = logo.status === 'set' || logo.status === 'already' ? 'pass' : 'warn'
  } catch (e) {
    res.logo = 'warn'
    res.errors.push(`logo: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 6 — ALTERNATIVES (computed live; HARD gate ≥3). Resolve once and reuse
  // the top picks for the editorial compares in step 7.
  let alts: Awaited<ReturnType<typeof resolveAlternatives>> = []
  try {
    alts = await resolveAlternatives(supabase, tool.id, 6)
    res.alternatives = alts.length
  } catch (e) {
    res.errors.push(`alternatives: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 7 — EDITORIAL COMPARES (HARD gate ≥2). Create up to 3 is_editorial
  // rows vs the top alts and generate prose inline; then count what exists.
  try {
    if (alts.length > 0) {
      await createEditorialCompares(supabase, { id: tool.id, slug: tool.slug }, alts, 3)
    }
    res.editorialCompares = await countEditorialCompares(supabase, tool.id)
  } catch (e) {
    res.errors.push(`editorial_compares: ${e instanceof Error ? e.message : 'unknown'}`)
    try {
      res.editorialCompares = await countEditorialCompares(supabase, tool.id)
    } catch {}
  }

  // Step 8 — FAQs (HARD gate ≥9). Re-fetch current count; only (re)generate if
  // below threshold so this is idempotent + cost-bounded.
  try {
    const gateRow = await fetchGateRow(supabase, tool.id)
    const have = Array.isArray(gateRow?.faqs_long_tail) ? gateRow!.faqs_long_tail!.length : 0
    if (have < 9) {
      const written = await generateLongTailFaqs(supabase, {
        id: tool.id,
        name: tool.name,
        tagline: tool.tagline,
        description: gateRow?.description ?? tool.description,
        pricing_type: gateRow?.pricing_type ?? tool.pricing_type,
        features: gateRow?.features ?? tool.features,
        best_for: gateRow?.best_for ?? tool.best_for,
        not_for: gateRow?.not_for ?? null,
        integrations: null,
      })
      res.faqs = written || have
    } else {
      res.faqs = have
    }
  } catch (e) {
    res.errors.push(`faqs: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 9 — SENTIMENT (SOFT — heavy/async; warn, never block).
  try {
    const ok = await refreshSentiment(supabase, tool)
    res.sentiment = ok ? 'pass' : 'warn'
  } catch (e) {
    res.sentiment = 'warn'
    res.errors.push(`sentiment: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Step 10 — GATE EVALUATION + QA record + publish-on-green.
  const gate = await fetchGateRow(supabase, tool.id)
  const checks: QaChecks = {}
  const mk = (s: GateStatus, detail: string): GateCheck => ({ status: s, detail })

  // HARD gates.
  // Cowork QA: description gate lowered 300 → 250. Real flagship tools (Canva 270,
  // Gemini 293, Mem 290) were blocked by a few chars of margin; 250 still ensures
  // a substantive description while letting good tools publish.
  const descLen = (gate?.description ?? '').length
  checks.description = mk(descLen >= 250 ? 'pass' : 'fail', `${descLen} chars (need ≥250)`)
  const featCount = Array.isArray(gate?.features) ? gate!.features!.length : 0
  checks.features = mk(featCount >= 3 ? 'pass' : 'fail', `${featCount} features (need ≥3)`)
  const pricingOk = VALID_PRICING.has(gate?.pricing_type ?? '')
  checks.pricing_type = mk(pricingOk ? 'pass' : 'fail', `pricing_type=${gate?.pricing_type ?? 'null'}`)
  checks.categories = mk(res.categorized >= 1 ? 'pass' : 'fail', `${res.categorized} categories (need ≥1)`)
  checks.alternatives = mk(res.alternatives >= 3 ? 'pass' : 'fail', `${res.alternatives} alternatives (need ≥3)`)
  checks.editorial_compares = mk(
    res.editorialCompares >= 2 ? 'pass' : 'fail',
    `${res.editorialCompares} editorial compares (need ≥2)`,
  )
  checks.faqs = mk(res.faqs >= 9 ? 'pass' : 'fail', `${res.faqs} faqs_long_tail (need ≥9)`)
  const hasBestFor = Array.isArray(gate?.best_for) && gate!.best_for!.length > 0
  const hasNotFor = Array.isArray(gate?.not_for) && gate!.not_for!.length > 0
  const hasVerdict = !!(gate?.editorial_verdict && gate.editorial_verdict.trim())
  checks.editorial_fields = mk(
    hasBestFor && hasNotFor && hasVerdict ? 'pass' : 'fail',
    `best_for=${hasBestFor} not_for=${hasNotFor} verdict=${hasVerdict}`,
  )

  // SOFT gates (warn only).
  checks.logo = mk(res.logo === 'pass' ? 'pass' : 'warn', res.logo === 'pass' ? 'real bucket logo' : 'favicon fallback')
  checks.sentiment = mk(res.sentiment, res.sentiment === 'pass' ? 'sentiment cached' : 'sentiment incomplete')
  const tutCount = Array.isArray(gate?.tutorial_urls) ? gate!.tutorial_urls!.length : 0
  checks.tutorials = mk(tutCount > 0 ? 'pass' : 'warn', `${tutCount} tutorials`)
  const modelCount = Array.isArray(gate?.models) ? gate!.models!.length : 0
  checks.models = mk(modelCount > 0 ? 'pass' : 'warn', `${modelCount} models`)
  const luCount = Array.isArray(gate?.latest_updates) ? gate!.latest_updates!.length : 0
  checks.latest_updates = mk(luCount > 0 ? 'pass' : 'warn', `${luCount} latest_updates`)
  checks.tags = mk(res.tags >= 3 ? 'pass' : 'warn', `${res.tags} tags`)

  res.checks = checks
  res.allGreen = isAllGreen(checks)

  // Publish only when all HARD gates pass. For a DRAFT, this flips is_published.
  // For A4's already-published lane, the guarded update is a harmless no-op.
  let published = false
  if (res.allGreen) {
    const { data: pubRow, error: pubErr } = await supabase
      .from('tools')
      .update({ is_published: true } as never)
      .eq('id', tool.id)
      .eq('is_published', false)
      .select('id')
    if (pubErr) {
      res.errors.push(`publish: ${pubErr.message}`)
    } else if (pubRow && (pubRow as unknown[]).length > 0) {
      published = true
    }
    // Whether we flipped it now or it was already live, an all-green tool is
    // considered published for the QA record + indexing.
    res.published = isDraft ? published : true

    // Indexing (invoke-only; never edits SEO-lane files).
    try {
      await submitToIndexNow(`/tools/${tool.slug}`)
    } catch (e) {
      res.errors.push(`indexnow: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  await writeQaRecord(supabase, tool.id, checks, res.allGreen, res.published)

  // Mark onboarded only if the CORE refresh landed — refresh is the gate.
  if (res.refreshed) {
    const { error } = await supabase
      .from('tools')
      .update({ onboarded_at: new Date().toISOString() } as never)
      .eq('id', tool.id)
      .is('onboarded_at', null)
    if (error) res.errors.push(`mark_onboarded: ${error.message}`)
    else res.onboarded = true
  }

  return res
}

function fatalResult(slug: string, e: unknown): OnboardStepResult {
  return {
    slug,
    refreshed: false,
    categorized: 0,
    tags: 0,
    viability: false,
    latestUpdates: false,
    logo: 'fail',
    alternatives: 0,
    editorialCompares: 0,
    faqs: 0,
    sentiment: 'warn',
    checks: {},
    allGreen: false,
    published: false,
    errors: [`fatal: ${e instanceof Error ? e.message : 'unknown'}`],
    onboarded: false,
  }
}

async function loadValidSlugs(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('categories').select('slug').order('slug')
  return ((data ?? []) as { slug: string }[]).map((c) => c.slug).filter(Boolean)
}

function logStep(runId: string, r: OnboardStepResult) {
  console.log(
    `[onboard:${runId}] ${r.slug} — refreshed=${r.refreshed} cats=${r.categorized} tags=${r.tags} viability=${r.viability} latest=${r.latestUpdates} logo=${r.logo} alts=${r.alternatives} cmp=${r.editorialCompares} faqs=${r.faqs} sentiment=${r.sentiment} allGreen=${r.allGreen} published=${r.published} onboarded=${r.onboarded}${r.errors.length ? ` errors=[${r.errors.join('; ')}]` : ''}`,
  )
}

/**
 * A4 fast lane (unchanged behaviour): onboard up to `limit` PUBLISHED tools
 * with onboarded_at IS NULL, oldest created_at first. Now also runs the premium
 * steps + writes a QA record, but since these rows are already published the
 * publish-on-green step is a no-op (it never unpublishes). Idempotent.
 */
export async function onboardPendingTools(limit = 5): Promise<OnboardResult> {
  const runId = crypto.randomUUID()
  const supabase = getAdminClient()
  const result: OnboardResult = { runId, processed: 0, onboarded: 0, published: 0, results: [] }

  const { data: pending, error } = await supabase
    .from('tools')
    .select(ONBOARD_SELECT)
    .eq('is_published', true)
    .is('onboarded_at', null)
    .lt('onboard_attempts', MAX_ONBOARD_ATTEMPTS) // Phase 10 #66 — stop retrying forever
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`onboard: fetch pending failed: ${error.message}`)
  }
  const tools = (pending ?? []) as unknown as PendingTool[]
  if (tools.length === 0) return result

  const validSlugs = await loadValidSlugs(supabase)
  const validTagSlugs = await loadValidTagSlugs(supabase)

  for (const tool of tools) {
    result.processed++
    const stepRes = await onboardOne(supabase, tool, validSlugs, validTagSlugs, false).catch((e) =>
      fatalResult(tool.slug, e),
    )
    if (stepRes.onboarded) result.onboarded++
    if (stepRes.published) result.published++
    result.results.push(stepRes)
    logStep(runId, stepRes)
    // Phase 10 #66 — count a failed attempt so a permanently-broken tool is
    // eventually dropped from the retry pool (surfaced by the draft-stuck alert).
    if (!stepRes.onboarded) {
      await supabase
        .from('tools')
        .update({ onboard_attempts: (tool.onboard_attempts ?? 0) + 1 } as never)
        .eq('id', tool.id)
    }
  }

  console.log(`[onboard:${runId}] Done: ${result.onboarded}/${result.processed} onboarded`)
  return result
}

/**
 * D2 gated draft lane: run the full premium SOP on up to `limit` DRAFT tools
 * (is_published=false), oldest first, and publish each one ONLY when all HARD
 * gates pass. This is the lane the 29 P0 tools flow through — D2 inserts them
 * as drafts, this drives them to the quality bar, and publishes the green ones.
 *
 * Pass `slugs` to target specific drafts (e.g. the smoke test).
 */
export async function runOnboardSop(
  opts: { limit?: number; slugs?: string[]; deadlineMs?: number } = {},
): Promise<OnboardResult> {
  const runId = crypto.randomUUID()
  const supabase = getAdminClient()
  const result: OnboardResult = { runId, processed: 0, onboarded: 0, published: 0, results: [] }

  let q = supabase.from('tools').select(ONBOARD_SELECT).eq('is_published', false)
  if (opts.slugs && opts.slugs.length > 0) q = q.in('slug', opts.slugs)
  // Phase 10 #66 — skip drafts that have failed too many times (unless an
  // operator explicitly targets them by slug).
  else q = q.lt('onboard_attempts', MAX_ONBOARD_ATTEMPTS)
  q = q.order('created_at', { ascending: true }).limit(opts.limit ?? 5)

  const { data: drafts, error } = await q
  if (error) throw new Error(`onboard-sop: fetch drafts failed: ${error.message}`)
  const tools = (drafts ?? []) as unknown as PendingTool[]
  if (tools.length === 0) return result

  const validSlugs = await loadValidSlugs(supabase)
  const validTagSlugs = await loadValidTagSlugs(supabase)

  for (const tool of tools) {
    // Dept C (fable 5 review) — time budget. One SOP tool runs many live
    // fetch + LLM steps; 5 of them regularly blew the route's 300s
    // maxDuration, so Vercel killed the process mid-run and the orphaned
    // `running` row was swept to `timeout` (8 alert emails on 2026-06-10
    // alone). Stop STARTING new tools past the deadline — each completed
    // tool is already committed, the rest are picked up next half-hour.
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) {
      console.log(`[onboard:${runId}] SOP deadline reached after ${result.processed} tool(s) — deferring the rest`)
      break
    }
    result.processed++
    const stepRes = await onboardOne(supabase, tool, validSlugs, validTagSlugs, true).catch((e) =>
      fatalResult(tool.slug, e),
    )
    if (stepRes.onboarded) result.onboarded++
    if (stepRes.published) result.published++
    result.results.push(stepRes)
    logStep(runId, stepRes)
    // Phase 10 #66 — count a failed attempt so a permanently-broken tool is
    // eventually dropped from the retry pool (surfaced by the draft-stuck alert).
    // Cowork QA FIX: key on `published`, not `onboarded`. A draft that runs the SOP
    // fine (onboarded=true) but can't clear a HARD gate (published=false) was never
    // counted — so the same 5 un-publishable tools sat at the front of the
    // oldest-first queue every run and starved the other ~68 drafts (head-of-line
    // block). Counting any non-publishing run means a persistently-stuck draft now
    // reaches MAX_ONBOARD_ATTEMPTS and is skipped, so the queue advances.
    if (!stepRes.published) {
      await supabase
        .from('tools')
        .update({ onboard_attempts: (tool.onboard_attempts ?? 0) + 1 } as never)
        .eq('id', tool.id)
    }
  }

  console.log(
    `[onboard:${runId}] SOP done: ${result.published}/${result.processed} published, ${result.onboarded} onboarded`,
  )
  return result
}
