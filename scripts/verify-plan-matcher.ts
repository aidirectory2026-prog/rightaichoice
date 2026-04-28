/**
 * Phase 7 Step 50 — Deterministic verification for the plan matcher fix.
 *
 * Asserts that `pickBestMatch` correctly resolves LLM-named tools against a
 * synthetic catalog, and that it never substitutes an unrelated popular tool
 * when a name doesn't match — which was the BUG-005 root cause.
 *
 * Run:    pnpm tsx scripts/verify-plan-matcher.ts
 * Exit:   0 on pass, 1 on fail. Suitable for CI gating.
 *
 * This is unit-level: no Anthropic API calls, no Supabase round-trip. Use the
 * dev-server browser repro from Phase7(qa-trust-fixes)/plan.md Step 50 for
 * end-to-end validation against real LLM output.
 */
import assert from 'node:assert/strict'
import { pickBestMatch } from '../lib/plan/resolve-tools'
import type { AIToolResult } from '../lib/data/ai-search'

function tool(slug: string, name: string, extra: Partial<AIToolResult> = {}): AIToolResult {
  return {
    id: `id-${slug}`,
    name,
    slug,
    tagline: '',
    description: '',
    pricing_type: 'freemium',
    skill_level: 'beginner',
    has_api: false,
    platforms: [],
    avg_rating: 4.5,
    review_count: 100,
    website_url: '',
    categories: [],
    tags: [],
    integrations: [],
    best_for: [],
    ...extra,
  }
}

const catalog: AIToolResult[] = [
  tool('chatgpt', 'ChatGPT'),
  tool('claude', 'Claude'),
  tool('gemini', 'Gemini'),
  tool('cursor', 'Cursor'),
  tool('github-copilot', 'GitHub Copilot'),
  tool('midjourney', 'Midjourney'),
  tool('runway', 'Runway'),
  tool('elevenlabs', 'ElevenLabs'),
  tool('zendesk-ai', 'Zendesk AI', { avg_rating: 4.8, review_count: 9000 }),
  tool('workday', 'Workday', { avg_rating: 4.7, review_count: 8500 }),
  tool('marsx', 'MarsX', { avg_rating: 4.9, review_count: 7000 }),
]

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  try {
    assert.deepStrictEqual(actual, expected)
    console.log(`  ✓ ${label}`)
  } catch {
    failures += 1
    console.log(`  ✗ ${label}`)
    console.log(`    expected: ${JSON.stringify(expected)}`)
    console.log(`    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log('\nPhase 7 Step 50 — plan matcher verification\n')

console.log('Tier 1 — exact slug match')
{
  const result = pickBestMatch('chatgpt', catalog)
  check('lowercase slug → ChatGPT', result.matchKind, 'exact_slug')
  check('  → resolved to ChatGPT', result.resolved?.name, 'ChatGPT')
}

console.log('\nTier 2 — exact name match (case-insensitive, suffix-stripped)')
{
  const result = pickBestMatch('ChatGPT', catalog)
  check('exact name → ChatGPT', result.resolved?.slug, 'chatgpt')
  // matchKind may be exact_slug (because "ChatGPT" lowercased = "chatgpt" = slug) — accept either
  if (result.matchKind !== 'exact_slug' && result.matchKind !== 'exact_name') {
    failures += 1
    console.log(`  ✗ matchKind expected exact_slug|exact_name, got ${result.matchKind}`)
  } else {
    console.log(`  ✓ matchKind = ${result.matchKind}`)
  }
}
{
  const result = pickBestMatch('ChatGPT Plus', catalog)
  check('"ChatGPT Plus" → strip Plus → ChatGPT', result.resolved?.name, 'ChatGPT')
}
{
  const result = pickBestMatch('GitHub Copilot', catalog)
  check('"GitHub Copilot" → exact name match', result.resolved?.slug, 'github-copilot')
}

console.log('\nTier 3 — fuzzy match')
{
  const result = pickBestMatch('eleven labs', catalog)
  check('"eleven labs" (spaced) → ElevenLabs', result.resolved?.name, 'ElevenLabs')
}

console.log('\nTier 4 — none (the BUG-005 critical guarantee)')
{
  // The newsletter scenario: LLM names "Beehiiv" but it isn't in catalog.
  // Old behavior: silently substitute Zendesk/Workday/MarsX (highest-rated
  // catalog tools). New behavior: return null + matchKind=none so the route
  // can render a placeholder.
  const result = pickBestMatch('Beehiiv', catalog)
  check('"Beehiiv" not in catalog → null', result.resolved, null)
  check('  → matchKind=none', result.matchKind, 'none')
}
{
  const result = pickBestMatch('Some Made-Up Tool', catalog)
  check('garbage name → null', result.resolved, null)
}
{
  // The QA-report failure: "newsletter" has no exact/fuzzy match in catalog.
  // Resolver must NOT return Zendesk AI just because it has a high rating.
  const result = pickBestMatch('newsletter platform', catalog)
  check('"newsletter platform" → null (not Zendesk/Workday)', result.resolved, null)
}

console.log('\nNegative — never substitute unrelated popular tools')
{
  // "ChatGPT 5" (a hypothetical newer version we don't have) — must not
  // match Cursor, Claude, or any other tool.
  const result = pickBestMatch('Brand-New-Model-X', catalog)
  check('unknown product name → null', result.resolved, null)
}

console.log('\nEdge cases')
{
  const result = pickBestMatch('', catalog)
  check('empty name → none', result.matchKind, 'none')
}
{
  const result = pickBestMatch('a', catalog)
  check('single-char name → none (too short to be useful)', result.matchKind, 'none')
}

// ─────────────────────────────────────────────────────────────
// Alternatives-ranking sanity (BUG-015 follow-up)
// ─────────────────────────────────────────────────────────────
//
// The v1 fix shipped with category-only ranking and let Mintlify (documentation
// platform) and INK Editor (SEO writer) surface as Claude alternatives because
// they share generic capability tags like writing-assistant. v2 introduces an
// IDENTITY_TAGS gate so the score depends on chatbot / text-generation /
// image-generation etc. rather than every tag equally.
//
// We can't unit-test the DB query here, but we *can* document the expected
// behaviour as a checklist for the live-site repro. After deploy:
//   /tools/claude  → alternatives must NOT include INK Editor or Mintlify
//                    Mintlify shares 2 tags with Claude (writing-assistant,
//                    code-generation) but neither is an identity tag, so the
//                    new gate filters it.
//   /tools/claude  → alternatives SHOULD include any of {ChatGPT, Gemini,
//                    Mistral, Cohere, Perplexity, Llama} that exist in catalog
//                    — they share `chatbot` and/or `text-generation` (identity
//                    tags) with Claude.
//   /tools/midjourney → alternatives SHOULD share `image-generation`.

console.log('')
if (failures > 0) {
  console.error(`✗ ${failures} verification failure(s).`)
  process.exit(1)
} else {
  console.log('✓ All matcher verifications pass.')
  process.exit(0)
}
