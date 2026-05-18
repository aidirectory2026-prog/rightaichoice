import { getAnthropicClient } from '@/lib/ai/anthropic'
import { fetchPageText } from './scrape'
import { z } from 'zod'

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
  // Step 40 depth fields — populated in the same pass so new tools land
  // with the full information richness, not a thinner cron-only subset.
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
  // Our editorial view — opinionated decision-helper paragraph rendered as the
  // "Should you use this?" block. Distinct from editorial_verdict (short take).
  our_views: z.string().max(3000).nullable().default(null),
})

export type EnrichedToolData = z.infer<typeof enrichedToolSchema>

export async function enrichTool(
  name: string,
  websiteUrl: string,
  rawDescription: string
): Promise<EnrichedToolData | null> {
  let pageText = ''
  try {
    pageText = await fetchPageText(websiteUrl)
  } catch {
    // Fall back to raw description only
  }

  const client = getAnthropicClient()

  const prompt = `You are enriching an AI-tool directory listing for a decision-support platform. Users read these pages to decide whether to adopt this tool. Depth and honesty matter more than marketing gloss. Ground every field in evidence from the provided content or widely-known public facts — never invent specifics.

Tool name: ${name}
Website URL: ${websiteUrl}
Raw description: ${rawDescription}
Website content (first 8000 chars):
"""
${pageText}
"""

Return a single JSON object with these exact fields:

Core fields:
- tagline: One-line hook (max 120 chars). Specific, not generic. "AI video editor for YouTubers" beats "Powerful AI tool."
- description: 3-4 substantive paragraphs (~600-1500 chars total) covering: what it does, who it's for, how it works at a high level, what makes it different. Avoid breathless marketing language — write like an informed reviewer.
- pricing_type: "free" | "freemium" | "paid" | "contact"
- pricing_details: Array of {plan, price, features[]} — include every tier with real feature lists (3-6 features each). Empty only if truly undisclosed.
- skill_level: "beginner" | "intermediate" | "advanced"
- has_api: boolean
- platforms: Array from "web" | "mobile" | "desktop" | "api" | "plugin" | "cli"
- features: 8-15 concrete capabilities (max 15). No fluff like "easy to use" — list actual functionality.
- integrations: Named third-party tools/platforms it connects to (max 15). Only real integrations.
- best_for: 3-5 ideal user archetypes or use cases (max 5). Sentence fragments.
- not_for: 2-5 honest disqualifications — when someone should pick a different tool (max 5). This is critical for decision-making trust.
- editorial_verdict: 2-3 sentence opinionated take — who should use it, main strength, main weakness. Don't hedge.

Depth fields (populate when evidence supports):
- tutorial_urls: Up to 10 absolute URLs to written tutorials / official walkthroughs. Prefer tool's own docs, dev.to, Medium. No homepage URLs.
- limitations: 2-4 sentence summary of real constraints: rate limits, regions, language support, context window, file-size caps, plan gating. Return null only if truly none are surfaced.
- models: Underlying AI models the tool exposes (e.g. "gpt-4o", "claude-sonnet-4-6", "stable-diffusion-xl"). Empty array if non-AI or fully abstracted.
- community_links: Object { g2_url?, g2_rating?, producthunt_url?, reddit_threads?[] }. Omit keys you cannot support from evidence.
- use_cases: 4-6 concrete, distinct, action-oriented use-case sentences (start with verb, max 180 chars). Example: "Draft first-pass product descriptions from a spec sheet." Skip generic ones like "save time."
- our_views: An opinionated 2-3 paragraph "Should you use this?" analysis (≤2500 chars) — the tradeoffs a thoughtful reviewer would raise. Covers: sweet spot, failure modes, what switching costs look like, what to pilot before committing. Null only if information is too thin to responsibly opine.

Rules:
- Valid JSON only. No markdown, no prose wrapping.
- URLs must include https:// and be real — use null (not "") when a URL is unknown.
- Prefer null (for single fields) or [] (for arrays) over guessing.
- Don't invent pricing, integrations, or model names.
- Keep descriptions and opinions honest — negative signals are valuable.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    normalizeEnrichmentPayload(parsed)
    return enrichedToolSchema.parse(parsed)
  } catch (e) {
    console.error(`Enrichment failed for ${name}:`, e)
    return null
  }
}

// Models often return "" or "N/A" for unknown URLs, and occasionally overflow
// text limits. Normalize to null/truncated before zod parse so a single bad
// field doesn't kill the whole enrichment.
function normalizeEnrichmentPayload(p: Record<string, unknown>): void {
  const isValidUrl = (x: unknown): boolean => typeof x === 'string' && /^https?:\/\//.test(x)
  const toNullOrUrl = (x: unknown): string | null => (isValidUrl(x) ? (x as string) : null)

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
}
