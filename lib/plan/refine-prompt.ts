/**
 * Lightweight prompt refinement for the /plan flow.
 *
 * Pure TypeScript — no LLM call. Sonnet 4.6 already tolerates typos, ESL,
 * metaphor, and most non-English queries via its system prompt, so the
 * extra Haiku hop proposed in Phase 6 plan.md would have cost latency
 * (Step 39) without meaningful quality lift. This layer handles the
 * mechanical parts: trim/collapse whitespace, cap length, and extract a
 * small set of intent keywords for the search cascade's final fallback
 * tier.
 */

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'for', 'with', 'to', 'from', 'of', 'in', 'on',
  'at', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its',
  'want', 'wants', 'need', 'needs', 'help', 'make', 'build', 'create',
  'start', 'use', 'using', 'how', 'what', 'when', 'where', 'why', 'which',
  'who', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'have',
  'has', 'had', 'some', 'any', 'all', 'one', 'two', 'this', 'that',
  'plan', 'project', 'tool', 'tools', 'ai',
])

export type RefinedPrompt = {
  normalizedGoal: string
  intentKeywords: string[]
}

export function refinePrompt(raw: string): RefinedPrompt {
  const normalizedGoal = raw.trim().replace(/\s+/g, ' ').slice(0, 500)

  const tokens = normalizedGoal
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))

  const seen = new Set<string>()
  const intentKeywords: string[] = []
  for (const t of tokens) {
    if (seen.has(t)) continue
    seen.add(t)
    intentKeywords.push(t)
    if (intentKeywords.length >= 5) break
  }

  return { normalizedGoal, intentKeywords }
}
