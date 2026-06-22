import { SupabaseClient } from '@supabase/supabase-js'
import { fetchPageText } from './scrape'
import { withRetry } from '@/lib/pipelines/with-logging'
import { EDITORIAL_VOICE } from '@/lib/copy/editorial-voice'
import { z } from 'zod'

// Phase 8 freshness contract (2026-05-16):
// Target: 200+ tools refreshed every day → ~10 per hourly cron fire = 240/day.
// Each tool: scrape vendor → DeepSeek synthesizes 9 SEO-load-bearing fields →
// atomic write. Sequential to respect vendor rate-limits.
//
// 2026-05-16 (user request): migrated from Anthropic Claude → DeepSeek V3.
// DeepSeek matches Claude Sonnet quality for structured extraction at ~10×
// cheaper. The 7-field lite-refresh now also includes `tagline` and
// `our_views` so product-page above-the-fold + sidebar both stay fresh.
// Heavier 22-field synthesis (faqs_long_tail, workflow_scenarios,
// pricing_plan_guides, recent_changes, etc.) ships via the monthly
// Phase 4 SOP run (`npm run refresh:apply -- --force`).

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const refreshSchema = z.object({
  tagline: z.string().min(20).max(140),
  description: z.string().max(2000),
  editorial_verdict: z.string().max(500),
  our_views: z.string().max(1800),
  pricing_type: z.enum(['free', 'freemium', 'paid', 'contact']),
  // Phase 12 Bug-2 (2026-06-22) — structured pricing tiers moved onto the FAST
  // lane. Previously written ONLY by the deep 22-field SOP (which had stalled →
  // 71% of tools' tiers ~27 days stale; 311 paid tools had no tiers at all). The
  // lite refresh runs 2×/day catalog-wide, so emitting pricing_details here keeps
  // the pricing tables users read ≤2-3 days fresh. Shape MUST match the deep SOP +
  // tool-page render: [{plan, price, features[]}].
  pricing_details: z
    .array(z.object({
      plan: z.string().min(1).max(60),
      price: z.string().min(1).max(60),
      features: z.array(z.string().max(160)).max(8).default([]),
    }))
    .max(8)
    .default([]),
  features: z.array(z.string().max(120)).max(15),
  integrations: z.array(z.string().max(80)).max(15),
  best_for: z.array(z.string().max(180)).max(5),
  not_for: z.array(z.string().max(180)).max(5),
})

type RefreshOut = z.infer<typeof refreshSchema>

interface RefreshResult {
  runId: string
  processed: number
  refreshed: number
  failed: number
  // Phase 11 B5 (2026-06-18) — scrape-outcome observability. `scrapeBlocked` =
  // refreshed via the profile+news fallback because the vendor page was
  // 403/SPA-blocked; `preserved` = skipped (no scrape AND no news). A spike in
  // scrapeBlocked is the signal that went unseen for months (the scraper silently
  // degrading on the flagships) — now surfaced to pipeline_runs metadata.
  scrapeBlocked: number
  preserved: number
  // Phase 11 (2026-06-18) — real cost tracking. DeepSeek returns token usage per
  // call; accumulate it so the route/script can recordTokens() and the in-app cost
  // tracker shows actual $ instead of $0 (the gap that hid spend until now).
  deepseekTokensIn: number
  deepseekTokensOut: number
}

const SYSTEM_PROMPT = `You are an editorial analyst at RightAIChoice, a decision engine for AI tools. You write punchy, specific, SEO-optimized copy that ranks on Google for buyer-intent queries. Never write generic marketing fluff. Always anchor in real features + real pricing from the sources provided (the current profile, the latest news, and the vendor page when available).

Return STRICT JSON matching this schema:
{
  "tagline": "1-sentence pitch, 20-140 chars, MUST include the primary keyword (the tool's core capability)",
  "description": "3-4 paragraph (1500-2000 chars) overview. Lead with what the tool does + who it's for. Reference 3-5 specific features. End with a positioning note vs alternatives.",
  "editorial_verdict": "2-3 sentence opinionated buyer-first take. Under 500 chars. Specific, not generic.",
  "our_views": "5-8 paragraph long-form editorial in our voice (800-1800 chars). Include: when to pick this, when to pass, comparison to closest alternative, real-world usage caveats.",
  "pricing_type": "free | freemium | paid | contact",
  "pricing_details": [{"plan": "Free | Pro | Team | Enterprise | exact tier name", "price": "$0/mo | $20/mo | Custom | exact published price", "features": ["3-8 concrete capabilities for this tier"]}],
  "features": ["8-15 feature strings, ≤120 chars each, concrete (verbs + nouns, not adjectives)"],
  "integrations": ["8-15 named integrations (Slack, Notion, GitHub, etc.). Skip generic categories."],
  "best_for": ["3-5 ideal use-cases / personas, ≤180 chars each"],
  "not_for": ["3-5 anti-fit scenarios, ≤180 chars each. Be honest — list real limitations."]
}

PRICING ACCURACY (pricing_details — buyers trust this most, so never guess):
- pricing_details = the published pricing tiers, ordered cheapest→priciest (0-8 items), each {plan, price, features}. Empty array [] for contact-sales-only tools with no visible tier list.
- Ground tiers in this priority: the VENDOR PRICING PAGE first, then LATEST NEWS (a reported price change WINS over a stale page), then the current profile's tiers, then well-established knowledge.
- Only list a tier + price you can confirm from the sources above. If you cannot confirm the current pricing, return [] rather than restating a price you can't stand behind — a missing tier list is better than a wrong one.
- Keep pricing_type consistent with the tiers (e.g. a $0 tier + paid tiers → "freemium"; only paid tiers → "paid"; sales-only → "contact").

FRESHNESS PRIORITY (most important rule — the whole point of this refresh):
- The user prompt includes a LATEST NEWS section with dated, independently-sourced updates (changelog / tech-press / community signal).
- When LATEST NEWS contradicts or extends the vendor page, the NEWS WINS. Examples: page says "100k context" but news says "200k+ context" → write the current number; page says "$20/mo" but news reports a hike to "$25/mo" → reflect the hike; page (dated) omits a recent model/feature launch covered in news → include it.
- Prefer specific, current facts — named model versions, dates, dollar amounts, version numbers — over generic phrasing. Surface CURRENT reality, never preserve dated vendor copy.
- This does NOT license fabrication: only state facts present in the LATEST NEWS or the website content. If neither contains a fact, omit it.

SEO rules:
- tagline + description MUST contain the tool's primary capability keyword (the thing it's known for)
- features should be search-able terms (developers, marketers Google them)
- best_for/not_for read like sub-headers buyers will scan
- our_views uses long-tail keywords naturally — never stuff
- NO prose, NO markdown fences, JUST the JSON object.

${EDITORIAL_VOICE}`

// Phase 11 B1 (2026-06-18): render the tool's captured latest_updates as a compact
// bulleted news block. Mirrors scripts/backfill-tool-data.ts so the hourly refresh
// has the same fresh-news visibility the monthly SOP does — the fix for editorial
// reasserting stale facts (e.g. "100k context") from vendor homepage + training.
function renderLatestNews(latestUpdates: unknown): string {
  const lu = Array.isArray(latestUpdates) ? (latestUpdates as LatestItem[]) : []
  if (!lu.length) {
    return '(no recent third-party news / changelog signal captured — synthesize from the vendor page only)'
  }
  return lu
    .slice(0, 10)
    .map((it) => `- ${it.date ?? '?'} · ${it.source ?? '?'} · ${(it.title ?? '').slice(0, 140)} — ${(it.summary ?? '').slice(0, 220)}`)
    .join('\n')
}

// Phase 11 B1.2 (2026-06-18): the prompt now always carries the existing profile
// as a base, and adapts to whether the vendor page actually scraped. When the
// scrape is blocked (403 / JS-only SPA — the flagships), we refresh from the
// existing profile + LATEST NEWS + the model's well-established knowledge of the
// tool, with an honesty guard, instead of freezing stale content forever.
function pricingTiersSummary(details: unknown): string {
  const tiers = Array.isArray(details) ? (details as Array<{ plan?: string; price?: string }>) : []
  if (!tiers.length) return '(none on file)'
  return tiers.map((t) => `${t.plan ?? '?'} = ${t.price ?? '?'}`).join('; ')
}

function buildPrompt(tool: ToolRow, pageText: string, scrapeOk: boolean, pricingText: string): string {
  const arr = (a: unknown) => (Array.isArray(a) && a.length ? (a as string[]).join('; ') : '(none)')

  const seedSection = `## CURRENT PROFILE ON FILE (your starting point — keep what's still accurate, correct what's outdated)
Tagline: ${tool.tagline ?? '(none)'}
Description: ${tool.description ?? '(none)'}
Pricing type: ${tool.pricing_type ?? '(unknown)'}
Pricing tiers on file: ${pricingTiersSummary(tool.pricing_details)}
Features: ${arr(tool.features)}
Integrations: ${arr(tool.integrations)}
Best for: ${arr(tool.best_for)}
Not for: ${arr(tool.not_for)}
Existing verdict: ${tool.editorial_verdict ?? '(none)'}`

  const scrapeSection = scrapeOk
    ? `## VENDOR PAGE CONTENT (scraped today; first 12000 chars)
"""
${pageText.slice(0, 12000)}
"""`
    : `## VENDOR PAGE CONTENT
(the vendor site could not be retrieved today — it is bot-protected or JavaScript-only. Do NOT treat this as "no information"; refresh from the CURRENT PROFILE, the LATEST NEWS, and your own knowledge of this widely-documented tool.)`

  // Phase 12 Bug-2 — dedicated pricing-page scrape so pricing_details is grounded
  // in the real tier list, not inferred from the marketing homepage.
  const pricingSection = pricingText
    ? `## VENDOR PRICING PAGE (scraped today; first 6000 chars — the authoritative source for pricing_details)
"""
${pricingText.slice(0, 6000)}
"""`
    : `## VENDOR PRICING PAGE
(could not be retrieved — derive pricing_details from the vendor page content above, the LATEST NEWS, the pricing tiers on file, and well-established knowledge, honouring the honesty guard. Return [] if you cannot confirm current tiers.)`

  const priority = scrapeOk
    ? `PRIORITY ORDER for facts:
1. LATEST NEWS — the MOST current source; OVERRIDES the profile or the page whenever they conflict (newer model versions, price changes, launches, deprecations).
2. VENDOR PAGE CONTENT — current as of today's scrape.
3. CURRENT PROFILE — fallback for anything the above don't cover.
Never invent features, integrations, or pricing tiers absent from all three above.`
    : `The vendor page is unavailable, so refresh from these instead:
1. LATEST NEWS — apply every relevant update.
2. CURRENT PROFILE — keep every fact that is still accurate.
3. Your own well-established knowledge of this well-known tool — USE IT to correct facts in the CURRENT PROFILE that are clearly outdated (superseded model versions, old context-window sizes, retired pricing tiers, renamed products).
HONESTY GUARD: state only facts you are confident are current and well-established. If you are unsure of a specific number (an exact price or limit), describe it qualitatively or omit it — never guess a specific you cannot stand behind. Do not fabricate integrations or features.
STALE-SPECIFIC RULE: do NOT copy a specific number out of the CURRENT PROFILE (context-window size, price, model version, parameter count) unless you are confident it is still current. A stale specific is worse than a qualitative description — if you cannot confirm the current value, write e.g. "a large context window for long documents" rather than restating "100k tokens", and "competitive paid tiers" rather than a price you can't verify.`

  return `Refresh editorial metadata for this AI tool.

Tool: ${tool.name}
Website: ${tool.website_url}

${seedSection}

${scrapeSection}

${pricingSection}

## LATEST NEWS / COMMUNITY SIGNAL (independently sourced — last ~90 days)
${renderLatestNews(tool.latest_updates)}

Synthesize per the schema. ${priority}
If a field still can't be filled with high confidence, return a safe minimum (only what the sources support; empty array if none).`
}

type UsageSink = (tokensIn: number, tokensOut: number) => void

async function callDeepSeek(tool: ToolRow, pageText: string, scrapeOk: boolean, pricingText: string, correction: string | undefined, onUsage: UsageSink): Promise<string> {
  // Retry only the network round-trip: DeepSeek 5xx / 429 (rate_limited) and
  // transient fetch failures are classified transient by withRetry and re-tried
  // with backoff. A 4xx-other or malformed body still fails through to the
  // per-tool catch in processTools, which records it in refresh_logs.
  const base = buildPrompt(tool, pageText, scrapeOk, pricingText)
  const userContent = correction
    ? `${base}\n\n---\nYour previous response failed schema validation: ${correction}\nReturn corrected STRICT JSON of the exact shape — no prose, no code fences.`
    : base
  const json = await withRetry(async () => {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        // Phase 12 Bug-2 — bumped 4096→5000 to fit the added pricing_details tiers
        // alongside the existing long-form fields (description + our_views).
        max_tokens: 5000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      // Phrase so classifyError maps 429→rate_limited (retry) and 5xx→api_error (retry).
      const tag = res.status === 429 ? 'rate limit' : `HTTP ${res.status}`
      throw new Error(`DeepSeek ${tag} (${res.status}): ${body.slice(0, 300)}`)
    }
    return (await res.json()) as {
      choices: Array<{ message: { content: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
  })
  if (json.usage) onUsage(json.usage.prompt_tokens ?? 0, json.usage.completion_tokens ?? 0)
  return json.choices[0]?.message?.content ?? ''
}

async function synthesize(tool: ToolRow, pageText: string, scrapeOk: boolean, pricingText: string, onUsage: UsageSink): Promise<RefreshOut> {
  // Single corrective retry on validation fail — same pattern as the
  // monthly Phase 4 SOP. Reduces transient validation failures by ~70%.
  let correction: string | undefined
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callDeepSeek(tool, pageText, scrapeOk, pricingText, correction, onUsage)
    const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    try {
      return refreshSchema.parse(JSON.parse(stripped))
    } catch (e) {
      if (attempt === 2) {
        throw new Error(`validation failed after retry: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`)
      }
      correction = e instanceof Error ? e.message.slice(0, 300) : 'invalid JSON'
    }
  }
  throw new Error('unreachable')
}

type LatestItem = { date?: string; source?: string; type?: string; title?: string; summary?: string }
type ToolRow = {
  id: string
  slug: string
  name: string
  website_url: string
  github_url: string | null
  // Phase 11 B1 (2026-06-18): fresh news/changelog signal captured by the nightly
  // refresh-latest-updates cron. Threaded into the editorial prompt so the hourly
  // refresh stops reasserting stale facts (e.g. "100k context") from the vendor
  // homepage + DeepSeek training when newer reality exists.
  latest_updates: unknown
  // Phase 11 B1.2 (2026-06-18): existing profile fields, passed as the base for the
  // refresh. Essential for the scrape-blocked path — flagships (claude.ai, x.ai,
  // perplexity.ai, gemini SPA) return 403/JS-shell, so without seed the refresh
  // either preserves stale content forever or has nothing to ground on.
  tagline: string | null
  description: string | null
  pricing_type: string | null
  // Phase 12 Bug-2 — current tiers passed as the seed so the model corrects vs
  // a fresh /pricing scrape rather than starting blank.
  pricing_details: unknown
  features: string[] | null
  integrations: string[] | null
  best_for: string[] | null
  not_for: string[] | null
  editorial_verdict: string | null
}

// Phase 12 Bug-2 — best-effort fetch of the vendor's /pricing page so the lite
// refresh grounds pricing_details in the real tier list. Non-fatal: an empty
// string just falls back to homepage + news + profile in the prompt.
async function fetchPricingText(websiteUrl: string): Promise<string> {
  try {
    const origin = new URL(websiteUrl).origin
    const txt = await fetchPageText(`${origin}/pricing`)
    return txt.trim().length >= 100 ? txt : ''
  } catch {
    return ''
  }
}

async function processTools(
  supabase: SupabaseClient,
  tools: ToolRow[],
  runId: string,
  result: RefreshResult,
): Promise<void> {
  for (const tool of tools) {
    const start = Date.now()
    result.processed++

    try {
      let pageText = ''
      let scrapeOk = false
      try {
        pageText = await fetchPageText(tool.website_url)
        scrapeOk = pageText.trim().length >= 200
      } catch {
        // scrape failed — handled below (do NOT overwrite editorial fields).
      }

      // Phase 12 Bug-2 — pull the dedicated /pricing page so pricing_details is
      // grounded in the real tiers. Only worth the fetch when we'll synthesize.
      const hasNewsEarly = Array.isArray(tool.latest_updates) && tool.latest_updates.length > 0
      const pricingText = (scrapeOk || hasNewsEarly) ? await fetchPricingText(tool.website_url) : ''

      // GitHub stars — cheap side-fetch, doesn't affect main payload.
      // Phase 10 #64 — authenticate (lifts the 60/hr unauthenticated cap so a
      // full run actually refreshes stars) and type-guard the value.
      let githubStars: number | null = null
      if (tool.github_url) {
        try {
          const repoPath = new URL(tool.github_url).pathname.slice(1)
          const ghHeaders: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
          if (process.env.GITHUB_REPO_TOKEN) ghHeaders.Authorization = `token ${process.env.GITHUB_REPO_TOKEN}`
          const ghRes = await fetch(`https://api.github.com/repos/${repoPath}`, { headers: ghHeaders })
          if (ghRes.ok) {
            const ghData = await ghRes.json()
            if (typeof ghData.stargazers_count === 'number') githubStars = ghData.stargazers_count
          }
        } catch {
          // Non-fatal — keep prior stars.
        }
      }

      // Phase 11 B1.2 (2026-06-18) — regenerate the editorial whenever we have
      // something fresh to ground on: a good scrape, OR captured news
      // (latest_updates). Phase 10 #53 used to preserve-and-skip on any scrape
      // failure (to avoid hallucinating from no input) — but the flagships
      // (claude.ai, x.ai, perplexity.ai, gemini SPA) are permanently 403/JS-blocked,
      // so "preserve" froze them with stale facts ("100k context") forever despite
      // the hourly cron claiming "refreshed". buildPrompt now grounds the no-scrape
      // path in the existing profile + news + model knowledge (with an honesty
      // guard), so we refresh instead of freeze. Only a tool with NO scrape AND NO
      // news is still preserved (nothing fresh to add — don't churn/risk drift).
      const hasNews = Array.isArray(tool.latest_updates) && tool.latest_updates.length > 0
      const shouldSynthesize = scrapeOk || hasNews
      const updateData: Record<string, unknown> = {
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      let fieldsUpdated: string[] = []
      if (shouldSynthesize) {
        const parsed = await synthesize(tool, pageText, scrapeOk, pricingText, (tIn, tOut) => {
          result.deepseekTokensIn += tIn
          result.deepseekTokensOut += tOut
        })
        Object.assign(updateData, parsed)
        fieldsUpdated = Object.keys(parsed)
        if (!scrapeOk) result.scrapeBlocked++ // regenerated via profile+news fallback
      } else {
        result.preserved++ // no scrape AND no news — nothing fresh to add
      }

      if (githubStars !== null) {
        updateData.github_stars = githubStars
        updateData.last_github_sync = new Date().toISOString()
        fieldsUpdated.push('github_stars')
      }

      const { error: updateError } = await supabase
        .from('tools')
        .update(updateData as never)
        .eq('id', tool.id)

      const duration = Date.now() - start

      if (updateError) throw updateError

      result.refreshed++
      await supabase.from('refresh_logs').insert({
        run_id: runId,
        tool_id: tool.id,
        tool_slug: tool.slug,
        status: 'refreshed',
        fields_updated: fieldsUpdated,
        error_message: shouldSynthesize
          ? (scrapeOk ? null : 'scrape_blocked: regenerated from profile + news + model knowledge')
          : 'scrape_failed + no news: editorial preserved',
        duration_ms: duration,
      } as never)
    } catch (e) {
      result.failed++
      await supabase.from('refresh_logs').insert({
        run_id: runId,
        tool_id: tool.id,
        tool_slug: tool.slug,
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
        duration_ms: Date.now() - start,
      } as never)
    }
  }
}

export async function runRefresh(
  supabase: SupabaseClient,
  batchSize = 10,
): Promise<RefreshResult> {
  const runId = crypto.randomUUID()
  const result: RefreshResult = { runId, processed: 0, refreshed: 0, failed: 0, scrapeBlocked: 0, preserved: 0, deepseekTokensIn: 0, deepseekTokensOut: 0 }

  // Phase 10 S5 — tier-aware, SLA-driven selection.
  //   1) DAILY tier (the top-150): refresh any that are "due" (>20h since last
  //      verify, or never) so the daily SLA holds — without re-burning AI on
  //      ones already refreshed today (lets small Vercel batches reach standard).
  //   2) STANDARD tier: fill the remaining budget stalest-first, so the long
  //      tail's max age stays within the 3-day SLA (throughput sized in
  //      freshness-batch.yml: ~765/day total).
  const dailyDueCutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  const { data: dailyDue, error: dailyErr } = await supabase
    .from('tools')
    .select('id, slug, name, website_url, github_url, latest_updates, tagline, description, pricing_type, pricing_details, features, integrations, best_for, not_for, editorial_verdict')
    .eq('is_published', true)
    .eq('refresh_tier', 'daily')
    .or(`last_verified_at.is.null,last_verified_at.lt.${dailyDueCutoff}`)
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(batchSize)
  if (dailyErr) console.error('Failed to fetch daily-tier tools for refresh:', dailyErr)
  const daily = (dailyDue ?? []) as ToolRow[]

  const remaining = Math.max(batchSize - daily.length, 0)
  let standard: ToolRow[] = []
  if (remaining > 0) {
    const { data: std, error: stdErr } = await supabase
      .from('tools')
      .select('id, slug, name, website_url, github_url, latest_updates, tagline, description, pricing_type, pricing_details, features, integrations, best_for, not_for, editorial_verdict')
      .eq('is_published', true)
      .eq('refresh_tier', 'standard')
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(remaining)
    if (stdErr) console.error('Failed to fetch standard-tier tools for refresh:', stdErr)
    standard = (std ?? []) as ToolRow[]
  }

  const tools = [...daily, ...standard]
  if (tools.length === 0) {
    console.log(`[refresh:${runId}] Nothing due to refresh`)
    return result
  }

  await processTools(supabase, tools, runId, result)

  console.log(
    `[refresh:${runId}] Done: ${result.refreshed} refreshed (${daily.length} daily + ${standard.length} standard), ${result.failed} failed`,
  )
  return result
}

// Retry path for an explicit slug list. Used by the one-off
// retry-failed-tools workflow that targets prior validation/scrape
// failures rather than the stalest-first queue.
export async function runRefreshForSlugs(
  supabase: SupabaseClient,
  slugs: string[],
  // Phase 9 D2: the gated onboard SOP runs the full editorial refresh on DRAFT
  // (is_published=false) tools before deciding whether to publish. Default
  // stays is_published=true so the existing hourly retry path is unchanged.
  opts?: { includeUnpublished?: boolean },
): Promise<RefreshResult> {
  const runId = crypto.randomUUID()
  const result: RefreshResult = { runId, processed: 0, refreshed: 0, failed: 0, scrapeBlocked: 0, preserved: 0, deepseekTokensIn: 0, deepseekTokensOut: 0 }

  if (slugs.length === 0) {
    console.log(`[refresh:${runId}] no slugs provided`)
    return result
  }

  // Supabase .in() caps at ~1000 elements; chunk to stay safe.
  const CHUNK = 200
  for (let i = 0; i < slugs.length; i += CHUNK) {
    const chunk = slugs.slice(i, i + CHUNK)
    let q = supabase
      .from('tools')
      .select('id, slug, name, website_url, github_url, latest_updates, tagline, description, pricing_type, pricing_details, features, integrations, best_for, not_for, editorial_verdict')
      .in('slug', chunk)
    if (!opts?.includeUnpublished) q = q.eq('is_published', true)
    const { data: tools, error } = await q

    if (error || !tools) {
      console.error(`[refresh:${runId}] fetch failed for chunk ${i}:`, error)
      continue
    }

    const found = new Set((tools as ToolRow[]).map((t) => t.slug))
    const missing = chunk.filter((s) => !found.has(s))
    if (missing.length) {
      console.warn(`[refresh:${runId}] ${missing.length} slugs not found / unpublished: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`)
    }

    await processTools(supabase, tools as ToolRow[], runId, result)
  }

  console.log(`[refresh:${runId}] Done: ${result.refreshed} refreshed, ${result.failed} failed (of ${slugs.length} requested)`)
  return result
}
