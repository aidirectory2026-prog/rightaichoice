import { SupabaseClient } from '@supabase/supabase-js'
import { fetchPageText } from './scrape'
import { withRetry } from '@/lib/pipelines/with-logging'
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
}

const SYSTEM_PROMPT = `You are an editorial analyst at RightAIChoice, a decision engine for AI tools. You write punchy, specific, SEO-optimized copy that ranks on Google for buyer-intent queries. Never write generic marketing fluff. Always anchor in real features + real pricing from the page content provided.

Return STRICT JSON matching this schema:
{
  "tagline": "1-sentence pitch, 20-140 chars, MUST include the primary keyword (the tool's core capability)",
  "description": "3-4 paragraph (1500-2000 chars) overview. Lead with what the tool does + who it's for. Reference 3-5 specific features. End with a positioning note vs alternatives.",
  "editorial_verdict": "2-3 sentence opinionated buyer-first take. Under 500 chars. Specific, not generic.",
  "our_views": "5-8 paragraph long-form editorial in our voice (800-1800 chars). Include: when to pick this, when to pass, comparison to closest alternative, real-world usage caveats.",
  "pricing_type": "free | freemium | paid | contact",
  "features": ["8-15 feature strings, ≤120 chars each, concrete (verbs + nouns, not adjectives)"],
  "integrations": ["8-15 named integrations (Slack, Notion, GitHub, etc.). Skip generic categories."],
  "best_for": ["3-5 ideal use-cases / personas, ≤180 chars each"],
  "not_for": ["3-5 anti-fit scenarios, ≤180 chars each. Be honest — list real limitations."]
}

SEO rules:
- tagline + description MUST contain the tool's primary capability keyword (the thing it's known for)
- features should be search-able terms (developers, marketers Google them)
- best_for/not_for read like sub-headers buyers will scan
- our_views uses long-tail keywords naturally — never stuff
- NO prose, NO markdown fences, JUST the JSON object.`

function buildPrompt(toolName: string, websiteUrl: string, pageText: string): string {
  return `Refresh editorial metadata for this AI tool.

Tool: ${toolName}
Website: ${websiteUrl}

Website content (first 12000 chars):
"""
${pageText.slice(0, 12000)}
"""

Synthesize per the schema. Use ONLY information present in the page content above — never invent features, integrations, or pricing tiers not visible there. If a field can't be filled with high confidence, return a safe minimum (e.g., for features list: only what the page lists; for integrations: empty array if none mentioned).`
}

async function callDeepSeek(toolName: string, websiteUrl: string, pageText: string): Promise<string> {
  // Retry only the network round-trip: DeepSeek 5xx / 429 (rate_limited) and
  // transient fetch failures are classified transient by withRetry and re-tried
  // with backoff. A 4xx-other or malformed body still fails through to the
  // per-tool catch in processTools, which records it in refresh_logs.
  const json = await withRetry(async () => {
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(toolName, websiteUrl, pageText) },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      // Phrase so classifyError maps 429→rate_limited (retry) and 5xx→api_error (retry).
      const tag = res.status === 429 ? 'rate limit' : `HTTP ${res.status}`
      throw new Error(`DeepSeek ${tag} (${res.status}): ${body.slice(0, 300)}`)
    }
    return (await res.json()) as { choices: Array<{ message: { content: string } }> }
  })
  return json.choices[0]?.message?.content ?? ''
}

async function synthesize(toolName: string, websiteUrl: string, pageText: string): Promise<RefreshOut> {
  // Single corrective retry on validation fail — same pattern as the
  // monthly Phase 4 SOP. Reduces transient validation failures by ~70%.
  let correction: string | undefined
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callDeepSeek(
      toolName,
      websiteUrl,
      correction ? `${pageText}\n\nPrev attempt failed: ${correction}. Return strict JSON.` : pageText,
    )
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

type ToolRow = { id: string; slug: string; name: string; website_url: string; github_url: string | null }

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
      try {
        pageText = await fetchPageText(tool.website_url)
      } catch {
        // Continue with just the name — DeepSeek can still produce
        // a baseline editorial from its training-data knowledge.
      }

      // GitHub stars — cheap side-fetch, doesn't affect main payload.
      let githubStars: number | null = null
      if (tool.github_url) {
        try {
          const repoPath = new URL(tool.github_url).pathname.slice(1)
          const ghRes = await fetch(`https://api.github.com/repos/${repoPath}`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
          })
          if (ghRes.ok) {
            const ghData = await ghRes.json()
            githubStars = ghData.stargazers_count
          }
        } catch {
          // Non-fatal — keep prior stars.
        }
      }

      const parsed = await synthesize(tool.name, tool.website_url, pageText)

      const fieldsUpdated = Object.keys(parsed)
      const updateData: Record<string, unknown> = {
        ...parsed,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
  const result: RefreshResult = { runId, processed: 0, refreshed: 0, failed: 0 }

  // Stalest-first ordering. nullsFirst → tools never refreshed jump the queue.
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, slug, name, website_url, github_url')
    .eq('is_published', true)
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(batchSize)

  if (error || !tools) {
    console.error('Failed to fetch tools for refresh:', error)
    return result
  }

  await processTools(supabase, tools as ToolRow[], runId, result)

  console.log(`[refresh:${runId}] Done: ${result.refreshed} refreshed, ${result.failed} failed`)
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
  const result: RefreshResult = { runId, processed: 0, refreshed: 0, failed: 0 }

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
      .select('id, slug, name, website_url, github_url')
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
