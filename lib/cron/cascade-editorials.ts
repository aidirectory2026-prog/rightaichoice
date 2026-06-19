import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Phase 8 cascade (2026-05-16):
// When a tool's last_verified_at moves past a comparison's last_reviewed_at,
// the editorial verdict / tldr / feature-analysis / pricing-analysis /
// use-cases / faqs in tool_comparisons.* are out of sync with the
// underlying tool data. This regenerates those fields via DeepSeek and
// bumps last_reviewed_at.
//
// Compare-page-level numeric facts (pricing tiers, integration list)
// already render LIVE from tools.* so users always see current numbers —
// this only refreshes the OPINION layer that was generated as text.

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

// Phase 9c hotfix (2026-05-17): bumped caps after observed DeepSeek
// natural output lengths blew past prior limits (feature_analysis
// ~1400-1700 chars, pricing_analysis ~1100-1300). Old caps caused
// 8/15 = 53% validation failures on a real run, which tripped the
// batch script's exit threshold and marked the whole job failed in GH
// Actions. New caps give DeepSeek headroom without bloating the page.
const editorialSchema = z.object({
  tldr: z.array(z.object({
    dimension: z.string().max(80),
    values: z.record(z.string(), z.string().max(240)),
  })).max(6),
  verdict: z.string().max(1000),
  feature_analysis: z.string().max(2000),
  pricing_analysis: z.string().max(1500),
  use_cases: z.array(z.object({
    persona: z.string().max(120),
    recommendedSlug: z.string(),
    reasoning: z.string().max(400),
  })).max(5),
  faqs: z.array(z.object({
    question: z.string().max(200),
    answer: z.string().max(700),
  })).max(8),
})

type EditorialOut = z.infer<typeof editorialSchema>

type LatestItem = { date?: string; source?: string; type?: string; title?: string; summary?: string }
type ToolFacts = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  pricing_type: string | null
  features: string[] | null
  integrations: string[] | null
  best_for: string[] | null
  not_for: string[] | null
  // Phase 11 B1 (2026-06-18): fresh news so the compare prose can cite recent
  // changes (new model versions, price moves, launches) the static facts miss.
  latest_updates: unknown
}

// Compact bulleted render of a tool's captured latest_updates for the prompt.
function renderLatestNews(latestUpdates: unknown): string {
  const lu = Array.isArray(latestUpdates) ? (latestUpdates as LatestItem[]) : []
  if (!lu.length) return '(no recent news captured)'
  return lu
    .slice(0, 6)
    .map((it) => `- ${it.date ?? '?'} · ${(it.title ?? '').slice(0, 120)} — ${(it.summary ?? '').slice(0, 160)}`)
    .join('\n')
}

const SYSTEM_PROMPT = `You are an independent editorial analyst at RightAIChoice writing a head-to-head comparison between AI tools. Your goal: help a buyer decide. Be specific, concrete, no fluff. Reference actual features + pricing tiers, never invent.

Return STRICT JSON matching this schema:
{
  "tldr": [{ "dimension": "Pricing", "values": { "tool-slug-a": "$20/mo", "tool-slug-b": "Free" } }, ...] (max 6 dimensions),
  "verdict": "2-3 sentence opinionated buyer-first take" (max 800 chars),
  "feature_analysis": "200-400 word feature comparison" (max 1200 chars),
  "pricing_analysis": "200-300 word pricing comparison" (max 1000 chars),
  "use_cases": [{ "persona": "Solo founder", "recommendedSlug": "tool-a", "reasoning": "Because..." }] (max 5),
  "faqs": [{ "question": "Q?", "answer": "A." }] (max 8)
}

FRESHNESS: each tool includes a LATEST NEWS block. When it contradicts or extends the static facts (a newer model version, a price change, a recent launch/deprecation), the news WINS — reflect current reality, never dated copy. Do not invent facts absent from both the facts and the news.

NO prose, NO fences, JUST the JSON.`

function buildPrompt(toolA: ToolFacts, toolB: ToolFacts): string {
  return [
    `Compare ${toolA.name} vs ${toolB.name}.`,
    '',
    `## ${toolA.name} (slug: ${toolA.slug})`,
    `tagline: ${toolA.tagline ?? '(none)'}`,
    `pricing_type: ${toolA.pricing_type ?? 'unknown'}`,
    `features: ${(toolA.features ?? []).slice(0, 12).join(', ')}`,
    `integrations: ${(toolA.integrations ?? []).slice(0, 12).join(', ')}`,
    `best_for: ${(toolA.best_for ?? []).join(', ')}`,
    `not_for: ${(toolA.not_for ?? []).join(', ')}`,
    `description: ${(toolA.description ?? '').slice(0, 800)}`,
    `LATEST NEWS:\n${renderLatestNews(toolA.latest_updates)}`,
    '',
    `## ${toolB.name} (slug: ${toolB.slug})`,
    `tagline: ${toolB.tagline ?? '(none)'}`,
    `pricing_type: ${toolB.pricing_type ?? 'unknown'}`,
    `features: ${(toolB.features ?? []).slice(0, 12).join(', ')}`,
    `integrations: ${(toolB.integrations ?? []).slice(0, 12).join(', ')}`,
    `best_for: ${(toolB.best_for ?? []).join(', ')}`,
    `not_for: ${(toolB.not_for ?? []).join(', ')}`,
    `description: ${(toolB.description ?? '').slice(0, 800)}`,
    `LATEST NEWS:\n${renderLatestNews(toolB.latest_updates)}`,
    '',
    'Regenerate the editorial comparison fields per the schema. Be specific to TODAY\'s data above — do not write generic comparisons. Reference actual features/pricing/integrations in the analysis sections, and let the LATEST NEWS override any stale static fact.',
  ].join('\n')
}

async function callDeepSeek(
  toolA: ToolFacts,
  toolB: ToolFacts,
  correction?: string,
): Promise<string> {
  const userBase = buildPrompt(toolA, toolB)
  const user = correction
    ? `${userBase}\n\n---\nPrev attempt failed validation: ${correction}\nReturn STRICT JSON matching the exact schema — fewer chars per field is fine, exceeding the max is not.`
    : userBase
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
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices[0]?.message?.content ?? ''
}

/**
 * Generate (or regenerate) the editorial prose for ONE comparison row via
 * DeepSeek and write it back. Exported (Phase 9 D2) so the onboard SOP can
 * fill freshly-created editorial compares inline instead of waiting for the
 * weekly cascade cron. Same single-corrective-retry validation as the cascade.
 */
export async function generateCompareEditorial(
  comparisonId: string,
  toolIds: string[],
  supabase: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  return regenOne(comparisonId, toolIds, supabase)
}

async function regenOne(
  comparisonId: string,
  toolIds: string[],
  supabase: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  if (toolIds.length < 2) return { ok: false, error: 'insufficient_tools' }

  const { data, error } = await supabase
    .from('tools')
    .select('id, slug, name, tagline, description, pricing_type, features, integrations, best_for, not_for, latest_updates')
    .in('id', toolIds.slice(0, 2))

  if (error || !data || data.length < 2) {
    return { ok: false, error: `fetch tools: ${error?.message ?? 'too few rows'}` }
  }
  const [toolA, toolB] = data as ToolFacts[]

  // Phase 9c hotfix (2026-05-17): single corrective retry on validation
  // fail. Same pattern as planner + refresh — DeepSeek often returns
  // valid JSON on attempt 2 when we feed back the specific error.
  let parsed: EditorialOut | null = null
  let lastErr = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: string
    try {
      raw = await callDeepSeek(toolA, toolB, attempt === 2 ? lastErr : undefined)
    } catch (err) {
      lastErr = (err as Error).message
      continue
    }
    const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    try {
      parsed = editorialSchema.parse(JSON.parse(stripped))
      break
    } catch (err) {
      lastErr = (err as Error).message.slice(0, 300)
    }
  }
  if (!parsed) {
    return { ok: false, error: `validation: ${lastErr.slice(0, 200)}` }
  }

  const { error: updateErr } = await supabase
    .from('tool_comparisons')
    .update({
      tldr: parsed.tldr,
      verdict: parsed.verdict,
      feature_analysis: parsed.feature_analysis,
      pricing_analysis: parsed.pricing_analysis,
      use_cases: parsed.use_cases,
      faqs: parsed.faqs,
      last_reviewed_at: new Date().toISOString(),
    } as never)
    .eq('id', comparisonId)

  if (updateErr) return { ok: false, error: `update: ${updateErr.message}` }
  return { ok: true }
}

type CascadeResult = {
  runId: string
  candidates: number
  regenerated: number
  failed: number
  failures: Array<{ comparison_slug: string; error: string }>
}

// Migration 133 (2026-05-31): a tool content-change now nulls last_reviewed_at
// on EVERY editorial comparison referencing that tool, so all of them surface
// at the top of v_stale_comparisons. The old default (20) capped how many drain
// per run, starving older compares behind a churning queue (prod observed 488
// stale, ~17.7d max lag). Default raised to 120 so the referencing set clears
// in a run or two. The GH Actions job (60-min budget) and ~$0.005/cascade keep
// this comfortably affordable; the per-run cap exists only to bound a single
// run, not to permanently strand compares.
export async function runCompareEditorialCascade(
  supabase: SupabaseClient,
  batchSize = 120,
): Promise<CascadeResult> {
  const runId = crypto.randomUUID()
  const result: CascadeResult = {
    runId,
    candidates: 0,
    regenerated: 0,
    failed: 0,
    failures: [],
  }

  // Pull most-stale-first from the view. Limit avoids timeouts in
  // larger backlogs — the daily cron just chips at the top of the queue.
  const { data: stale, error } = await supabase
    .from('v_stale_comparisons')
    .select('comparison_id, comparison_slug, tool_ids, staleness')
    .order('staleness', { ascending: false })
    .limit(batchSize)

  if (error || !stale) {
    console.error(`[cascade:${runId}] view query failed: ${error?.message}`)
    return result
  }

  result.candidates = stale.length

  for (const row of stale as Array<{
    comparison_id: string
    comparison_slug: string
    tool_ids: string[]
  }>) {
    const out = await regenOne(row.comparison_id, row.tool_ids, supabase)
    if (out.ok) {
      result.regenerated++
    } else {
      result.failed++
      result.failures.push({ comparison_slug: row.comparison_slug, error: out.error ?? '?' })
    }
  }

  console.log(
    `[cascade:${runId}] candidates=${result.candidates} regenerated=${result.regenerated} failed=${result.failed}`,
  )
  return result
}
