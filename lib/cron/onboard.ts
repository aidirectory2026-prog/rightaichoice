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
 * SKIPPED HERE — LOGO: the resolve+verify+upload logic lives entirely inside
 * scripts/backfill-logos.ts (a CLI script: `export {}`, ~15 sharp/image
 * helpers, not importable). Extracting it cleanly is too invasive for this PR,
 * so logo is intentionally LEFT to the nightly backfill-logos job, which
 * already targets every `logo_url IS NULL` tool. The runtime favicon fallback
 * (lib/tool-logo.ts) covers a new tool in the meantime, so there is no broken
 * state. This is flagged rather than forced.
 *
 * Each step is independently try/caught: one failing step never aborts the
 * others, and we record which succeeded. `onboarded_at = now()` is set only
 * after the CORE fields are populated (refresh is the gate — without it the
 * tool has no editorial body). Re-running on an already-onboarded tool is a
 * no-op (the `onboarded_at IS NULL` filter excludes it), so the cron is
 * idempotent.
 *
 * Workstream C (full premium SOP — editorial compares, FAQ≥9 gate,
 * JSON-LD/indexing, QA checklist) will EXTEND this file: add more steps to
 * `onboardOne` and gates before the `onboarded_at` write. Structure is kept
 * step-wise + result-recording so C can slot in without a rewrite.
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

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_CATEGORY_MODEL = 'deepseek-chat'

type PendingTool = {
  id: string
  slug: string
  name: string
  website_url: string | null
  changelog_url: string | null
  blog_url: string | null
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
}

export type OnboardStepResult = {
  slug: string
  refreshed: boolean
  categorized: number // count of categories assigned
  viability: boolean
  latestUpdates: boolean
  errors: string[]
  onboarded: boolean
}

export type OnboardResult = {
  runId: string
  processed: number
  onboarded: number
  results: OnboardStepResult[]
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

async function onboardOne(
  supabase: SupabaseClient,
  tool: PendingTool,
  validSlugs: string[],
): Promise<OnboardStepResult> {
  const res: OnboardStepResult = {
    slug: tool.slug,
    refreshed: false,
    categorized: 0,
    viability: false,
    latestUpdates: false,
    errors: [],
    onboarded: false,
  }

  // Step 1 — REFRESH (the core gate): re-scrapes the vendor site and writes the
  // 9 SEO editorial fields + github_stars + last_verified_at. Reuses the exact
  // single-slug path the nightly refresh uses.
  try {
    const r = await runRefreshForSlugs(supabase, [tool.slug])
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

  // (Step 5 — LOGO: intentionally skipped; nightly backfill-logos job owns it.
  //  See file header for the rationale.)

  // Mark onboarded only if the CORE fields landed — refresh is the gate. The
  // other steps are enrichment; if refresh failed the tool has no editorial
  // body, so leave onboarded_at NULL and retry on the next cron fire.
  if (res.refreshed) {
    const { error } = await supabase
      .from('tools')
      .update({ onboarded_at: new Date().toISOString() } as never)
      .eq('id', tool.id)
      .is('onboarded_at', null)
    if (error) {
      res.errors.push(`mark_onboarded: ${error.message}`)
    } else {
      res.onboarded = true
    }
  }

  return res
}

/**
 * Onboard up to `limit` pending tools (onboarded_at IS NULL), oldest
 * created_at first. Idempotent — already-onboarded tools are filtered out.
 */
export async function onboardPendingTools(limit = 5): Promise<OnboardResult> {
  const runId = crypto.randomUUID()
  const supabase = getAdminClient()
  const result: OnboardResult = { runId, processed: 0, onboarded: 0, results: [] }

  const { data: pending, error } = await supabase
    .from('tools')
    .select(
      'id, slug, name, website_url, changelog_url, blog_url, is_wrapper, github_url, github_stars, pricing_type, created_at, tagline, description, features, best_for',
    )
    .eq('is_published', true)
    .is('onboarded_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`onboard: fetch pending failed: ${error.message}`)
  }
  const tools = (pending ?? []) as unknown as PendingTool[]
  if (tools.length === 0) {
    return result
  }

  // Valid category slugs — fetched once for the whole batch.
  const { data: catData } = await supabase.from('categories').select('slug').order('slug')
  const validSlugs = ((catData ?? []) as { slug: string }[]).map((c) => c.slug).filter(Boolean)

  for (const tool of tools) {
    result.processed++
    const stepRes = await onboardOne(supabase, tool, validSlugs).catch((e) => ({
      slug: tool.slug,
      refreshed: false,
      categorized: 0,
      viability: false,
      latestUpdates: false,
      errors: [`fatal: ${e instanceof Error ? e.message : 'unknown'}`],
      onboarded: false,
    } as OnboardStepResult))
    if (stepRes.onboarded) result.onboarded++
    result.results.push(stepRes)
    console.log(
      `[onboard:${runId}] ${tool.slug} — refreshed=${stepRes.refreshed} cats=${stepRes.categorized} viability=${stepRes.viability} latest=${stepRes.latestUpdates} onboarded=${stepRes.onboarded}${stepRes.errors.length ? ` errors=[${stepRes.errors.join('; ')}]` : ''}`,
    )
  }

  console.log(`[onboard:${runId}] Done: ${result.onboarded}/${result.processed} onboarded`)
  return result
}
