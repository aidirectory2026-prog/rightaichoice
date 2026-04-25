/**
 * Lightweight prompt refinement for the /plan flow.
 *
 * Pure TypeScript — no LLM call. Sonnet 4.6 already tolerates typos, ESL,
 * metaphor, and most non-English queries via its system prompt.
 *
 * Step 48 (Slice 1): the normalized goal is preserved at full length up to
 * 5000 chars so Sonnet sees the user's actual intent on long prompts. The
 * keyword extraction window stays at the first 500 chars on purpose —
 * tier-3 fallback retrieval works on a small set of strong keywords, and
 * scanning thousands of chars dilutes signal with conversational noise.
 */

const MAX_GOAL_LENGTH = 5000
const KEYWORD_WINDOW = 500

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
  const normalizedGoal = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_GOAL_LENGTH)
  const keywordSource = normalizedGoal.slice(0, KEYWORD_WINDOW)

  const tokens = keywordSource
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
