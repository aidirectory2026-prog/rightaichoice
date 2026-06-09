import { fetchToolPagesBundle } from './scrape'
import { z } from 'zod'

// Phase 8.h (2026-05-25) — switched from Anthropic to DeepSeek per user
// memory rule ("DeepSeek for backfill / SEO generation; Anthropic only for
// /plan flow"). Also extended scraping from single homepage fetch to a
// multi-page bundle (pricing + changelog + features + about + blog + docs +
// releases) so the LLM has CURRENT data, not just stale homepage copy.

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const enrichedToolSchema = z.object({
  tagline: z.string().max(120),
  description: z.string().max(3000),
  pricing_type: z.enum(['free', 'freemium', 'paid', 'contact']),
  pricing_details: z.array(z.object({
    plan: z.string(),
    price: z.string(),
    features: z.array(z.string()),
  })).default([]),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),
  has_api: z.boolean(),
  platforms: z.array(z.enum(['web', 'mobile', 'desktop', 'api', 'plugin', 'cli'])),
  features: z.array(z.string()).max(15),
  integrations: z.array(z.string()).max(15),
  best_for: z.array(z.string()).max(5),
  not_for: z.array(z.string()).max(5),
  editorial_verdict: z.string().max(500),
  tutorial_urls: z.array(z.string().url()).max(10).default([]),
  limitations: z.string().max(1000).nullable().default(null),
  models: z.array(z.string().max(80)).max(10).default([]),
  community_links: z
    .object({
      g2_url: z.string().url().nullable().optional(),
      g2_rating: z.number().min(0).max(5).nullable().optional(),
      producthunt_url: z.string().url().nullable().optional(),
      reddit_threads: z.array(z.string().url()).max(5).default([]),
    })
    .default({ reddit_threads: [] }),
  use_cases: z.array(z.string().max(220)).max(6).default([]),
  our_views: z.string().max(3000).nullable().default(null),
  // Phase 8.h (2026-05-25) — "what's current" capture so vendor pages
  // never go stale on day one. Up to 5 dated bullets from changelog/blog/
  // releases content. Stored in tools.latest_updates as JSON.
  latest_updates: z.array(z.object({
    date: z.string().max(40),
    source: z.enum(['changelog', 'blog', 'news', 'reddit', 'hackernews', 'twitter']),
    type: z.enum(['feature', 'pricing', 'launch', 'discussion', 'news', 'changelog']),
    title: z.string().max(200),
    url: z.string().url().max(500),
    summary: z.string().max(280),
  })).max(5).default([]),
})

export type EnrichedToolData = z.infer<typeof enrichedToolSchema>

export async function enrichTool(
  name: string,
  websiteUrl: string,
  rawDescription: string
): Promise<EnrichedToolData | null> {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(`Enrichment skipped for ${name}: DEEPSEEK_API_KEY missing`)
    return null
  }

  // Multi-page scrape: homepage + pricing + changelog + features + about + blog + docs + releases.
  let pagesBundle = ''
  try {
    pagesBundle = await fetchToolPagesBundle(websiteUrl)
  } catch {
    // Fall back to raw description only
  }

  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = `You are an editorial AI synthesising tool listings for a decision-support directory. Today's date is ${today}. Users rely on these pages to make adoption decisions, so depth and CURRENT accuracy matter more than marketing gloss. Ground every field in the multi-page evidence provided — never invent specifics. Prefer null/[] over fabrication. When the changelog or blog mentions a NEWER model version, recent launch, or 2026 update, USE that update — do not default to stale homepage copy.`

  const userPrompt = `Tool name: ${name}
Website URL: ${websiteUrl}
Raw description: ${rawDescription}

Multi-page scrape (homepage + pricing + changelog + features + about + blog + docs + releases — section headers ===Page: /path=== mark each):
"""
${pagesBundle}
"""

Return a single STRICT JSON object with these exact fields:

Core fields:
- tagline: One-line hook (max 120 chars). Specific, not generic.
- description: 3-4 substantive paragraphs (~600-1500 chars total) covering: what it does, who it's for, how it works, what makes it different. Reviewer voice, not marketing.
- pricing_type: "free" | "freemium" | "paid" | "contact"
- pricing_details: Array of {plan, price, features[]} — every tier from /pricing with 3-6 real features each.
- skill_level: "beginner" | "intermediate" | "advanced"
- has_api: boolean
- platforms: Array from "web" | "mobile" | "desktop" | "api" | "plugin" | "cli"
- features: 8-15 concrete capabilities. No fluff.
- integrations: Named third-party tools (max 15). Only real ones from /integrations or homepage.
- best_for: 3-5 ideal user archetypes (max 5).
- not_for: 2-5 honest disqualifications.
- editorial_verdict: 2-3 sentence opinionated take.

Depth fields:
- tutorial_urls: Up to 10 absolute URLs to written tutorials/walkthroughs.
- limitations: 2-4 sentence summary of real constraints (rate limits, context window, plan gating).
- models: Underlying AI models (e.g. "gpt-4o", "claude-sonnet-4-6").
- community_links: { g2_url?, g2_rating?, producthunt_url?, reddit_threads?[] }.
- use_cases: 4-6 concrete action-oriented sentences (start with verb, max 180 chars).
- our_views: Opinionated 2-3 paragraph "Should you use this?" analysis (max 2500 chars).

PHASE 8.h CURRENT-DATA FIELD (critical):
- latest_updates: Array of up to 5 most recent items from the changelog/blog/releases evidence above. Each item must be a full object with EVERY field:
  - date: YYYY-MM-DD (skip entries without a real date — don't invent)
  - source: one of "changelog" | "blog" | "news"
  - type: one of "feature" | "pricing" | "launch" | "changelog" | "news"
  - title: ≤200 char headline as worded on the page
  - url: ABSOLUTE URL to the specific changelog entry / blog post (NOT just the section index — include the slug/anchor when available)
  - summary: 1-2 sentence (≤280 char) plain-language summary of what the update actually does for users
  Sort newest-first. Empty array beats invented entries.

Rules:
- Valid JSON only. No markdown, no prose wrapping.
- URLs include https:// and be real — null (not "") for unknowns.
- Don't invent pricing, integrations, model names, or update dates.
- Prefer null/[] over guessing.`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`Enrichment failed for ${name}: DeepSeek API ${res.status} — ${body.slice(0, 200)}`)
      return null
    }
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const text = json.choices[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(match[0])
    } catch {
      // DeepSeek sometimes emits raw control chars (\n \t) inside string
      // literals + trailing commas. Strip control chars and retry once.
      const sanitized = match[0]
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(sanitized)
    }
    normalizeEnrichmentPayload(parsed as Record<string, unknown>)
    return enrichedToolSchema.parse(parsed)
  } catch (e) {
    console.error(`Enrichment failed for ${name}:`, e)
    return null
  }
}

function normalizeEnrichmentPayload(p: Record<string, unknown>): void {
  const isValidUrl = (x: unknown): boolean => typeof x === 'string' && /^https?:\/\//.test(x)
  const toNullOrUrl = (x: unknown): string | null => (isValidUrl(x) ? (x as string) : null)

  // Phase 8.h fix (2026-05-25) — DeepSeek often returns `null` instead of
  // omitting array fields. Zod `.default([])` only applies on missing keys,
  // not on explicit null. Coerce null/undefined array fields to [] before
  // schema parse so a single null doesn't kill the whole tool.
  const arrayFields = ['features', 'integrations', 'best_for', 'not_for', 'models', 'platforms', 'pricing_details', 'tutorial_urls', 'use_cases', 'latest_updates']
  for (const f of arrayFields) {
    if (p[f] === null || p[f] === undefined) p[f] = []
  }

  // DeepSeek often returns null for has_api when unknown; coerce to false so
  // one null doesn't kill an otherwise-valid enrichment.
  if (typeof p.has_api !== 'boolean') {
    p.has_api = p.has_api === true || p.has_api === 'true' || p.has_api === 1
  }
  // pricing_type must match the enum. Phase 10 #52 — the old coercion dumped
  // every unrecognized value to 'contact', which falsely implies enterprise
  // "contact sales" and caused ~38% of the catalog (262 with no pricing data) to
  // be mislabeled. Recognize far more real signals, and default genuinely-unknown
  // tools to 'freemium' (the modal AI-tool model) rather than 'contact'.
  const validPricing = new Set(['free', 'freemium', 'paid', 'contact'])
  if (typeof p.pricing_type !== 'string' || !validPricing.has(p.pricing_type as string)) {
    const raw = String(p.pricing_type ?? '').toLowerCase()
    const hasFreeTier = Array.isArray(p.pricing_details) &&
      (p.pricing_details as Array<Record<string, unknown>>).some((t) => {
        const price = String(t?.price ?? '').toLowerCase()
        return price.includes('free') || price === '$0' || price === '0'
      })
    const hasPaidTier = Array.isArray(p.pricing_details) && (p.pricing_details as unknown[]).length > 0
    if (raw.includes('open') || raw === 'oss' || raw === '$0' || raw === '0' || raw === 'none') p.pricing_type = 'free'
    else if (raw === 'free') p.pricing_type = 'free'
    else if (raw.includes('trial') || raw.includes('freemium') || hasFreeTier) p.pricing_type = 'freemium'
    else if (raw.includes('enterprise') || raw.includes('custom') || raw.includes('quote') || raw.includes('contact') || raw.includes('sales')) p.pricing_type = 'contact'
    else if (
      raw.includes('subscription') || raw.includes('paid') || raw.includes('usage') ||
      raw.includes('pay') || raw.includes('credit') || raw.includes('seat') ||
      raw.includes('tier') || raw.includes('month') || raw.includes('/mo') || raw.includes('$')
    ) p.pricing_type = 'paid'
    else p.pricing_type = hasPaidTier ? 'paid' : 'freemium'
  }
  // skill_level enum guard
  const validSkill = new Set(['beginner', 'intermediate', 'advanced'])
  if (typeof p.skill_level !== 'string' || !validSkill.has(p.skill_level as string)) {
    p.skill_level = 'intermediate'
  }

  // Sanitize nested objects inside arrays — null on tier.price/plan/features
  // would otherwise fail the per-item schema. Drop incomplete tiers.
  if (Array.isArray(p.pricing_details)) {
    p.pricing_details = (p.pricing_details as Array<Record<string, unknown>>)
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        plan: typeof t.plan === 'string' && t.plan.length > 0 ? t.plan : null,
        price: typeof t.price === 'string' && t.price.length > 0 ? t.price : (typeof t.price === 'number' ? String(t.price) : null),
        features: Array.isArray(t.features)
          ? (t.features as unknown[]).filter((f) => typeof f === 'string' && (f as string).length > 0)
          : [],
      }))
      .filter((t) => t.plan !== null && t.price !== null)
  }
  // Sanitize latest_updates items into the {date, source, type, title, url, summary} shape
  if (Array.isArray(p.latest_updates)) {
    const validSource = new Set(['changelog', 'blog', 'news', 'reddit', 'hackernews', 'twitter'])
    const validType = new Set(['feature', 'pricing', 'launch', 'discussion', 'news', 'changelog'])
    p.latest_updates = (p.latest_updates as Array<Record<string, unknown>>)
      .filter((u) => u && typeof u === 'object')
      .map((u) => {
        const title = (typeof u.title === 'string' && u.title) || (typeof u.headline === 'string' && u.headline) || ''
        const date = typeof u.date === 'string' ? u.date.slice(0, 40) : ''
        const source = validSource.has(u.source as string) ? (u.source as string) : 'blog'
        const type = validType.has(u.type as string) ? (u.type as string) : (source === 'changelog' ? 'changelog' : 'news')
        const url = typeof u.url === 'string' && /^https?:\/\//.test(u.url) ? u.url : ''
        const summary = (typeof u.summary === 'string' && u.summary) || (typeof u.headline === 'string' && u.headline.length > 60 ? u.headline : '')
        return { date, source, type, title: title.slice(0, 200), url, summary: summary.slice(0, 280) }
      })
      .filter((u) => u.title && u.date && u.url)
      .slice(0, 5)
  }
  // Coerce null strings in scalar string fields
  const stringFields = ['tagline', 'description', 'editorial_verdict', 'limitations', 'our_views']
  for (const f of stringFields) {
    if (p[f] === null) p[f] = (f === 'limitations' || f === 'our_views') ? null : ''
  }
  // Filter null/non-string entries from string arrays + cap to schema-allowed length
  const stringArrayFieldsWithCaps: Array<[string, number, number]> = [
    ['features', 15, 500], ['integrations', 15, 100], ['best_for', 5, 200],
    ['not_for', 5, 200], ['models', 10, 80], ['platforms', 10, 30],
    ['tutorial_urls', 10, 500],
  ]
  for (const [f, maxItems, maxLen] of stringArrayFieldsWithCaps) {
    if (Array.isArray(p[f])) {
      p[f] = (p[f] as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .map((x) => x.length > maxLen ? x.slice(0, maxLen) : x)
        .slice(0, maxItems)
    }
  }
  // pricing_details cap to schema max
  if (Array.isArray(p.pricing_details)) {
    p.pricing_details = (p.pricing_details as Array<Record<string, unknown>>).slice(0, 10)
  }

  if (Array.isArray(p.tutorial_urls)) {
    p.tutorial_urls = (p.tutorial_urls as unknown[]).filter(isValidUrl).slice(0, 10)
  } else {
    p.tutorial_urls = []
  }

  const cl = (p.community_links as Record<string, unknown> | null | undefined) ?? {}
  const nextCl: Record<string, unknown> = {
    g2_url: toNullOrUrl(cl.g2_url),
    producthunt_url: toNullOrUrl(cl.producthunt_url),
    reddit_threads: Array.isArray(cl.reddit_threads)
      ? (cl.reddit_threads as unknown[]).filter(isValidUrl).slice(0, 5)
      : [],
  }
  if (typeof cl.g2_rating === 'number') nextCl.g2_rating = cl.g2_rating
  p.community_links = nextCl

  if (typeof p.our_views === 'string' && p.our_views.length > 3000) {
    p.our_views = (p.our_views as string).slice(0, 3000)
  }
  if (typeof p.description === 'string' && p.description.length > 3000) {
    p.description = (p.description as string).slice(0, 3000)
  }
  if (typeof p.editorial_verdict === 'string' && p.editorial_verdict.length > 500) {
    p.editorial_verdict = (p.editorial_verdict as string).slice(0, 500)
  }
  if (typeof p.limitations === 'string' && p.limitations.length > 1000) {
    p.limitations = (p.limitations as string).slice(0, 1000)
  }
  if (Array.isArray(p.use_cases)) {
    p.use_cases = (p.use_cases as unknown[])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => (x.length > 220 ? x.slice(0, 220) : x))
      .slice(0, 6)
  }
  // (latest_updates already normalized above into the proper shape — nothing more to do here)
}
