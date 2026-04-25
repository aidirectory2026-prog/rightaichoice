/**
 * Quality gate (Step 48.6).
 *
 * After the planner returns stages-with-tools, this module asks Haiku
 * "does this credibly answer the user's goal?". If the gate fails, we
 * broaden retrieval (drop category filter, lean on intent keywords) and
 * accept the retried result. One retry max.
 *
 * Latency design:
 * - Skip the gate entirely when every stage is matchTier='keyword' with
 *   ≥2 tools (well-formed traffic, ~70% of requests).
 * - When the gate fires, hard cap: gate call ≤1500ms, retry ≤2000ms.
 * - Worst-case extra latency: ~3.5s. Pass-case extra: ~500ms.
 *
 * The gate is intentionally lenient. Its job is to catch obvious semantic
 * mismatches (asked about voice, got image gen), not to grade fit-and-finish.
 * Strict grading would block too many borderline-OK answers and add noise.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { searchStageTools, type MatchTier } from './stage-search'

const GATE_MODEL = 'claude-haiku-4-5-20251001'
const GATE_TIMEOUT_MS = 1500
const GATE_RETRY_TIMEOUT_MS = 2000

export type GateStageInput = {
  id: string
  name: string
  description: string
  searchQuery: string
  matchTier: MatchTier
  toolResults: Array<{ name: string; tagline: string }>
}

export type GateVerdict = {
  pass: boolean
  reason?: string
}

/**
 * Whether to run the gate at all. Skip well-formed retrievals to save
 * the latency budget for the cases that actually need help.
 */
export function shouldRunQualityGate(stages: GateStageInput[]): boolean {
  return stages.some((s) => s.matchTier !== 'keyword' || s.toolResults.length < 2)
}

const SYSTEM_PROMPT = `You are a quality grader for an AI-tool recommendation system.

Given a user's goal and the stack the system returned, decide whether the stack credibly addresses the goal.

Respond with ONLY a JSON object:
{"pass": true}
or
{"pass": false, "reason": "<one short sentence>"}

PASS (be lenient — pass is the default):
- Tools in each stage are at least adjacent to the stage's purpose
- The stack as a whole covers the user's stated goal, even partially
- For broken/short/vague prompts, "adjacent and useful" is enough

FAIL (only when there's a real mismatch):
- A stage returned 0 tools
- A stage's tools are clearly off-topic (e.g. user asked about voice cloning, returned image generators)
- The whole stack misses the user's primary intent (e.g. user wanted to start a podcast, stack is all about coding)

Respond with ONLY the JSON. No prose, no markdown.`

export async function runQualityGate({
  anthropic,
  query,
  stages,
}: {
  anthropic: Anthropic
  query: string
  stages: GateStageInput[]
}): Promise<GateVerdict> {
  const stackSummary = stages
    .map((s) => {
      const tools = s.toolResults.length
        ? s.toolResults.map((t) => `  - ${t.name}: ${t.tagline}`).join('\n')
        : '  (no tools)'
      return `Stage "${s.name}" (${s.description}):\n${tools}`
    })
    .join('\n\n')

  const userMessage = `User goal: "${query}"\n\nRecommended stack:\n${stackSummary}`

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: GATE_MODEL,
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('gate_timeout')), GATE_TIMEOUT_MS)
      ),
    ])

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { pass: boolean; reason?: string }
    return parsed.pass === true
      ? { pass: true }
      : { pass: false, reason: parsed.reason ?? 'gate_failed_no_reason' }
  } catch {
    // Any failure (timeout, parse error, API error) is treated as pass.
    // The gate is best-effort; never block the user's response on it.
    return { pass: true }
  }
}

/**
 * Broaden retrieval for stages that failed the gate. Strong stages
 * (keyword tier with ≥2 tools) are kept untouched — only the weak ones
 * get re-searched without the category filter.
 *
 * Hard timeout 2000ms; on timeout, returns the originals so we never
 * stall the user-visible response.
 */
export async function broadenRetrieval<T extends GateStageInput>({
  stages,
  intentKeywords,
}: {
  stages: T[]
  intentKeywords: string[]
}): Promise<T[]> {
  const work = Promise.all(
    stages.map(async (stage) => {
      const strong = stage.matchTier === 'keyword' && stage.toolResults.length >= 2
      if (strong) return stage

      const { results, tier } = await searchStageTools({
        searchQuery: stage.searchQuery,
        fallbackKeywords: intentKeywords,
      })
      return {
        ...stage,
        toolResults: results.slice(0, 3) as unknown as T['toolResults'],
        matchTier: tier,
      }
    })
  )

  try {
    return await Promise.race([
      work,
      new Promise<T[]>((_, reject) =>
        setTimeout(() => reject(new Error('broaden_timeout')), GATE_RETRY_TIMEOUT_MS)
      ),
    ])
  } catch {
    return stages
  }
}
