/**
 * Phase 7B — Programmatic compare-page generation.
 *
 * For the top 300 tools by Phase 7A compare-bucket combined_score,
 * builds 5 alternative pairings per tool (data-driven first, catalog
 * fallback) and generates editorial JSON for each pair via DeepSeek V3.
 * Writes 1,500 rows into `tool_comparisons` with `is_editorial=true`
 * + populated tldr/verdict/feature_analysis/pricing_analysis/
 * use_cases/benchmarks/faqs JSONB columns. The existing
 * `app/compare/[slug]/page.tsx` handler renders these without any
 * route-side change.
 *
 * USAGE:
 *   npm run compare:dry                           # list top 20 pairs, no API calls
 *   npm run compare:dry -- --slug=cursor          # pairs involving cursor only
 *   npm run compare:apply -- --limit=1            # smoke-test on 1 pair
 *   npm run compare:apply                         # full 1,500-pair run
 *   npm run compare:apply -- --slug=cursor        # only cursor's pairs
 *
 * REQUIRED ENV (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * READS:
 *   scripts/.keyword-opportunities.json  (Phase 7A merged output)
 *
 * COST: ~$0.005/page DeepSeek V3 × 1,500 pages ≈ $8. Add 25% retry
 * buffer → budget ~$10. Runtime: 5-way concurrency × ~1.5s/page ≈ 8-12 min.
 *
 * SLUG CANONICAL FORM: alphabetically sorted "{slug-a}-vs-{slug-b}".
 * Prevents URL fragmentation across the 1,500 pages. Existing
 * user-saved comparisons via /compare?tools= keep arbitrary order;
 * this script only writes is_editorial=true rows.
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { getAdminClient } from '../lib/cron/supabase-admin'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.compare-progress.json')
const OPPS_FILE = join(process.cwd(), 'scripts', '.keyword-opportunities.json')

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const TOP_TOOLS = 300
const PAIRS_PER_TOOL = 5
const MAX_PAIRS = 1500
const CONCURRENCY = 5

// ── Types ────────────────────────────────────────────────────────────────────

type Tool = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  pricing_type: string | null
  pricing_details: unknown
  features: string[] | null
  integrations: string[] | null
  use_cases: string[] | null
  best_for: string[] | null
  not_for: string[] | null
  avg_rating: number | null
  review_count: number | null
  view_count: number | null
  viability_score: number | null
}

type Opportunity = {
  tool_slug: string
  page_type: string
  target_keyword: string
  source: string
  combined_score: number
}

type Pair = {
  slug_a: string // alpha-sorted
  slug_b: string
  tool_a: Tool
  tool_b: Tool
  pair_slug: string // {slug_a}-vs-{slug_b}
  source_score: number // sum of compare-bucket scores from either tool's queries that match this pair
  origin: 'data-driven' | 'catalog'
}

type Progress = {
  processed: string[]
  failed: Array<{ slug: string; error: string }>
  skipped_existing: string[]
}

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isApply = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const slugArg = args.find((a) => a.startsWith('--slug='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const targetSlug = slugArg ? slugArg.split('=')[1] : undefined

if (!isDryRun && !isApply) {
  console.error('Pass --dry-run or --apply (see script header for examples).')
  process.exit(1)
}

if (isApply && !process.env.DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY missing from .env.local')
  process.exit(1)
}

// ── Output schema (zod) ──────────────────────────────────────────────────────
// values shape on TLDR/benchmarks is `{[toolSlug: string]: ...}` — must
// include exactly the two slugs; pre-validation sanitizer enforces.

const tldrRowSchema = z.object({
  dimension: z.string().min(2).max(60),
  values: z.record(z.string(), z.string().max(220)),
})

const benchmarkRowSchema = z.object({
  dimension: z.string().min(2).max(60),
  values: z.record(
    z.string(),
    z.object({
      score: z.string().max(60),
      unit: z.string().max(40),
      source: z.string().max(120),
    })
  ),
})

const useCaseSchema = z.object({
  persona: z.string().min(3).max(120),
  recommendedSlug: z.string().min(1).max(80),
  reasoning: z.string().min(60).max(500),
})

const faqSchema = z.object({
  question: z.string().min(15).max(220),
  answer: z.string().min(50).max(900),
})

// v2 schema (2026-05-12): bumped word/char floors for SEO ranking.
// Page-level target is 1,800-2,800 words. Failed-attempt patterns from
// v1 (use_cases.persona > 80, pricing_analysis > 2000) addressed:
// persona max 120, pricing_analysis max 3500.
const compareOutputSchema = z.object({
  tldr: z.array(tldrRowSchema).min(4).max(6),
  verdict: z.string().min(180).max(1000),
  feature_analysis: z.string().min(1100).max(4500),
  pricing_analysis: z.string().min(400).max(3500),
  use_cases: z.array(useCaseSchema).min(3).max(5),
  benchmarks: z.array(benchmarkRowSchema).max(5).nullable(),
  faqs: z.array(faqSchema).min(6).max(10),
})

type CompareOutput = z.infer<typeof compareOutputSchema>

// ── Catalog fetch ────────────────────────────────────────────────────────────

async function fetchPublishedTools(): Promise<Tool[]> {
  const supa = getAdminClient()
  const all: Tool[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select(
        'id, slug, name, tagline, description, pricing_type, pricing_details, features, integrations, use_cases, best_for, not_for, avg_rating, review_count, view_count, viability_score'
      )
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as Tool[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

// Already-existing editorial slugs (skip rather than re-write)
async function fetchExistingEditorialSlugs(): Promise<Set<string>> {
  const supa = getAdminClient()
  const out = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tool_comparisons')
      .select('slug')
      .eq('is_editorial', true)
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    for (const r of rows) out.add(r.slug)
    if (rows.length < PAGE) break
  }
  return out
}

// ── Tool selection + scoring ─────────────────────────────────────────────────

function loadOpportunities(): Opportunity[] {
  if (!existsSync(OPPS_FILE)) {
    console.error(`\n❌ ${OPPS_FILE} not found. Run \`npm run mine:merge\` first.\n`)
    process.exit(1)
  }
  const raw = JSON.parse(readFileSync(OPPS_FILE, 'utf-8'))
  return (raw.opportunities ?? []) as Opportunity[]
}

function scoreToolsByCompareBucket(opps: Opportunity[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const o of opps) {
    if (o.page_type !== 'compare') continue
    m.set(o.tool_slug, (m.get(o.tool_slug) ?? 0) + (o.combined_score ?? 0))
  }
  return m
}

// ── Pair extraction ──────────────────────────────────────────────────────────

// Strip "the", trailing punctuation, " ai", " app" suffixes — then
// match against a normalized tool-name index. Catches "claude code" =
// "Claude Code", "github copilot" = "GitHub Copilot", etc.
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}]/g, '')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\b(ai|app|tool|software|platform)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildNameIndex(tools: Tool[]): Map<string, Tool> {
  const m = new Map<string, Tool>()
  for (const t of tools) {
    m.set(normalizeName(t.name), t)
    m.set(normalizeName(t.slug.replace(/-/g, ' ')), t)
  }
  return m
}

// Parse "X vs Y" / "X vs. Y" / "X versus Y" — return the part after vs.
function extractCompetitor(query: string): string | null {
  const match = query.match(/\b(?:vs\.?|versus|compared\s+to)\s+(.+?)(?:\s+|$)/i)
  if (!match) return null
  // The competitor name is the portion between "vs" and either the
  // next " vs" (multi-pair query) or end of string. Stop at common
  // qualifier words ("for", "in", "review").
  let name = match[1].trim()
  name = name.replace(/\s+(for|in|review|reviews|2024|2025|2026|free|paid|pricing|cost).*$/i, '')
  return name.length >= 2 && name.length <= 60 ? name : null
}

function buildDataDrivenPairs(
  toolsByScore: Tool[],
  opps: Opportunity[],
  nameIndex: Map<string, Tool>
): Map<string, Pair[]> {
  // tool_slug → array of pairs (will be capped at PAIRS_PER_TOOL later)
  const out = new Map<string, Pair[]>()
  const oppsByTool = new Map<string, Opportunity[]>()
  for (const o of opps) {
    if (o.page_type !== 'compare') continue
    if (!oppsByTool.has(o.tool_slug)) oppsByTool.set(o.tool_slug, [])
    oppsByTool.get(o.tool_slug)!.push(o)
  }

  for (const tool of toolsByScore) {
    const myOpps = oppsByTool.get(tool.slug) ?? []
    if (myOpps.length === 0) continue
    // Sort opps by combined_score desc — process strongest signals first
    myOpps.sort((a, b) => b.combined_score - a.combined_score)
    const seenCompetitors = new Set<string>()
    const pairs: Pair[] = []
    for (const opp of myOpps) {
      const competitor = extractCompetitor(opp.target_keyword)
      if (!competitor) continue
      const norm = normalizeName(competitor)
      if (norm === normalizeName(tool.name)) continue // self-match
      if (seenCompetitors.has(norm)) continue
      const matchedTool = nameIndex.get(norm)
      if (!matchedTool) continue
      if (matchedTool.slug === tool.slug) continue
      seenCompetitors.add(norm)
      const [slug_a, slug_b] = [tool.slug, matchedTool.slug].sort()
      const tool_a = slug_a === tool.slug ? tool : matchedTool
      const tool_b = slug_a === tool.slug ? matchedTool : tool
      pairs.push({
        slug_a,
        slug_b,
        tool_a,
        tool_b,
        pair_slug: `${slug_a}-vs-${slug_b}`,
        source_score: opp.combined_score,
        origin: 'data-driven',
      })
      if (pairs.length >= PAIRS_PER_TOOL) break
    }
    if (pairs.length > 0) out.set(tool.slug, pairs)
  }
  return out
}

async function fillCatalogFallback(
  toolsByScore: Tool[],
  pairsByTool: Map<string, Pair[]>,
  toolsBySlug: Map<string, Tool>
): Promise<void> {
  // For tools with < PAIRS_PER_TOOL data-driven pairs, query the
  // tool_alternatives join table to fill in.
  const supa = getAdminClient()
  for (const tool of toolsByScore) {
    const existing = pairsByTool.get(tool.slug) ?? []
    if (existing.length >= PAIRS_PER_TOOL) continue
    const need = PAIRS_PER_TOOL - existing.length
    const { data, error } = await supa
      .from('tool_alternatives')
      .select('alternative_id')
      .eq('tool_id', tool.id)
      .limit(need * 4) // overfetch in case some alts are unpublished or already in pairs
    if (error || !data || data.length === 0) continue
    const altIds = data.map((r: any) => r.alternative_id as string)
    const seenSlugs = new Set(existing.map((p) => (p.slug_a === tool.slug ? p.slug_b : p.slug_a)))
    let added = 0
    for (const altId of altIds) {
      const altTool = [...toolsBySlug.values()].find((t) => t.id === altId)
      if (!altTool) continue
      if (seenSlugs.has(altTool.slug)) continue
      const [slug_a, slug_b] = [tool.slug, altTool.slug].sort()
      const tool_a = slug_a === tool.slug ? tool : altTool
      const tool_b = slug_a === tool.slug ? altTool : tool
      existing.push({
        slug_a,
        slug_b,
        tool_a,
        tool_b,
        pair_slug: `${slug_a}-vs-${slug_b}`,
        source_score: 0,
        origin: 'catalog',
      })
      seenSlugs.add(altTool.slug)
      added += 1
      if (added >= need) break
    }
    pairsByTool.set(tool.slug, existing)
  }
}

// Global pair dedup by canonical pair_slug. Higher-scoring tool's
// version wins (already deduped within tool above).
function dedupAndCap(pairsByTool: Map<string, Pair[]>): Pair[] {
  const seen = new Map<string, Pair>()
  // Iterate tools by score order (caller already sorted)
  for (const pairs of pairsByTool.values()) {
    for (const p of pairs) {
      if (!seen.has(p.pair_slug)) {
        seen.set(p.pair_slug, p)
      }
    }
  }
  const all = [...seen.values()].sort((a, b) => b.source_score - a.source_score)
  return all.slice(0, MAX_PAIRS)
}

// ── DeepSeek prompts ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are RightAIChoice's senior editorial reviewer producing SEO-optimized compare-page content for two AI tools. Pages must compete for top Google rankings on "X vs Y" head terms — that requires depth (1,800–2,800 words total), declarative answers, and real data, not template fluff.

HARD RULES (non-negotiable):

1. **No fabrication.** Every capability, integration, pricing tier, use case, and benchmark must come from the input data. If the input is silent on a topic, say so honestly ("Public benchmarks not yet available", "Pricing details not published") rather than inventing.

2. **No marketing superlatives.** Never use "best-in-class", "industry-leading", "revolutionary", "game-changing", "cutting-edge", "world-class", "premier", "enterprise-grade" (unless quoting the vendor and marked as such). Practitioner voice — confident, specific, no hype.

3. **Declarative winners.** Each section must take a clear position. "Tool A wins for use case X because of specific reason Y." Avoid hedging like "both are good" or "it depends" without follow-up specifics.

4. **Target keyword density.** The canonical "<Tool A> vs <Tool B>" phrase (using exact tool names) MUST appear:
   - In the FIRST 100 characters of the verdict
   - In at least 2 of the feature_analysis H2 headings (e.g. "## Pricing: <A> vs <B>")
   - In at least 3 places naturally in body prose
   - Include 2–3 semantic variations: "<A> versus <B>", "<A> compared to <B>", "<A> or <B>", "switching from <A> to <B>"

5. **2026 freshness framing.** Use "in 2026" or "as of 2026" at least twice across the page. Pricing analysis MUST reference whether tiers are current (vendor pricing as of 2026).

6. **E-E-A-T signals.** Feature_analysis MUST include at least 2 external references in markdown link form when the input data references them (vendor docs, official changelog, benchmark source). Use the format: [vendor docs](url). If input has no URLs, skip — never invent.

7. **JSON OUTPUT ONLY.** No prose outside the JSON. No markdown fences around the JSON.

OUTPUT SCHEMA:

{
  "tldr": [
    {"dimension": "<short label>", "values": {"<slug-a>": "<70–200 char concrete answer>", "<slug-b>": "<70–200 char concrete answer>"}},
    ...
  ],
  // 4–6 rows. REQUIRED dimensions (at minimum): "Best for", "Pricing", "Setup complexity", "Strongest differentiator". Each value must be specific and contrasting.

  "verdict": "<180–700 char declarative paragraph. Open with '<Tool A> vs <Tool B>' phrase. Name a clear winner for the most common use case in sentence 1. Sentence 2–3: the secondary winner + the deciding factor.>",

  "feature_analysis": "<1,100–4,000 word markdown article. STRUCTURE:
    ## <H2 incorporating 'vs' or both tool names>: <Specific capability area>
    (3–5 sentences of substantive analysis. Cite specific features from input. End with declarative 'X wins here because...' or 'X and Y tie on this' statement.)

    Repeat for 4–6 H2 sections covering: Core capabilities, AI/model approach, Integrations & ecosystem, Performance & scale, Developer experience or Workflow. Each H2 must be 180–400 words.

    Markdown allowed: ## H2 only (no ### H3 except inside H2 bodies), - bullets, **bold**, [link text](url) for external refs from input.
  >",

  "pricing_analysis": "<400–3000 word markdown. STRUCTURE:
    ## <Tool A> pricing (2026)
    (Cite every plan/tier from pricing_details. Note hidden costs, overage fees, contract terms.)

    ## <Tool B> pricing (2026)
    (Same depth.)

    ## Value-per-dollar: <A> vs <B>
    (Direct declarative comparison. Who wins per company-size or use-case segment. Pricing must be current as of 2026.)
  >",

  "use_cases": [
    {"persona": "<concrete role/team-size combo, 3–120 chars>", "recommendedSlug": "<slug-a OR slug-b>", "reasoning": "<60–500 char specific reason — name the feature/pricing/integration that drives the recommendation>"},
    ...
  ],
  // 3–5 rows. Cover varied team sizes/budgets. Each reasoning must cite a specific feature or pricing fact.

  "benchmarks": [
    {"dimension": "<benchmark name>", "values": {"<slug-a>": {"score": "<value>", "unit": "<unit>", "source": "<source>"}, "<slug-b>": {...}}},
    ...
  ] OR null,
  // null when no defensible benchmarks exist in input. 0–5 rows otherwise.

  "faqs": [
    {"question": "<20–220 char question a real buyer asks>", "answer": "<120–800 char direct answer that opens with the answer, not 'It depends'>"},
    ...
  ]
  // 6–10 FAQs. REQUIRED topics (at minimum): pricing/free tier, integrations, migration path, learning curve, scale/team-size fit. Plus 2+ specific buyer questions surfaced from the tools' data.
}

Use the EXACT slug strings provided in input as keys in tldr.values and benchmarks.values. recommendedSlug must be one of the two slugs.

PRICING ABSENCE: if pricing_details is empty/null for both tools, write a brief honest pricing_analysis acknowledging the absence — never fabricate tiers.

BENCHMARKS ABSENCE: if input has no defensible benchmark data, return benchmarks: null (the JSON literal null, not an empty array).`

function buildUserPrompt(a: Tool, b: Tool, scoreContext?: string): string {
  function fmtTool(t: Tool): string {
    return `--- ${t.name} (slug: ${t.slug}) ---
Tagline: ${t.tagline ?? '(none)'}
Description: ${(t.description ?? '').slice(0, 1500)}
Pricing type: ${t.pricing_type ?? 'unknown'}
Pricing details: ${JSON.stringify(t.pricing_details ?? null).slice(0, 1500)}
Features: ${(t.features ?? []).slice(0, 15).join('; ') || '(none listed)'}
Integrations: ${(t.integrations ?? []).slice(0, 15).join('; ') || '(none listed)'}
Use cases: ${(t.use_cases ?? []).slice(0, 8).join('; ') || '(none listed)'}
Best for: ${(t.best_for ?? []).slice(0, 5).join('; ') || '(none listed)'}
Not for: ${(t.not_for ?? []).slice(0, 4).join('; ') || '(none listed)'}
Average rating: ${t.avg_rating ?? 'n/a'} (${t.review_count ?? 0} reviews)
Viability score: ${t.viability_score ?? 'n/a'}/100`
  }

  return `Generate the JSON compare-page content for these two tools.

${fmtTool(a)}

${fmtTool(b)}

Use exactly these slugs as object keys in tldr.values and benchmarks.values:
- "${a.slug}"
- "${b.slug}"

${scoreContext ? `Real-world keyword signal driving this page: ${scoreContext}\n` : ''}Return strict JSON object matching the schema in the system prompt. No prose, no markdown fences.`
}

async function callDeepSeek(a: Tool, b: Tool, scoreContext?: string, correction?: string): Promise<string> {
  const userBase = buildUserPrompt(a, b, scoreContext)
  const userContent = correction
    ? `${userBase}\n\n---\n\nYour previous response failed schema validation:\n${correction}\n\nReturn corrected STRICT JSON of the exact shape, no prose, no code fences. Pay close attention to character limits and required field types.`
    : userBase

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      // v2 (2026-05-12): bumped from 4096 to 8192 since feature_analysis
      // alone can now reach ~3,000 words ≈ 4,000 tokens; combined with
      // pricing_analysis, faqs, and use_cases we need headroom.
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
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

// Single corrective auto-retry on schema fail (mirrors Phase 4 SOP).
async function generatePairContent(pair: Pair, scoreContext?: string): Promise<CompareOutput> {
  let correction: string | undefined
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callDeepSeek(pair.tool_a, pair.tool_b, scoreContext, correction)
    const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(stripped)
    } catch (err) {
      correction = `JSON parse error: ${err instanceof Error ? err.message : String(err)}`
      continue
    }

    // Sanitize: ensure tldr/benchmarks values use exactly the two slugs
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.tldr)) {
      obj.tldr = (obj.tldr as Array<Record<string, unknown>>).filter(
        (row) =>
          row?.values &&
          typeof row.values === 'object' &&
          (row.values as any)[pair.slug_a] != null &&
          (row.values as any)[pair.slug_b] != null
      )
    }
    if (Array.isArray(obj.benchmarks)) {
      obj.benchmarks = (obj.benchmarks as Array<Record<string, unknown>>).filter(
        (row) =>
          row?.values &&
          typeof row.values === 'object' &&
          (row.values as any)[pair.slug_a] != null &&
          (row.values as any)[pair.slug_b] != null
      )
      if ((obj.benchmarks as unknown[]).length === 0) obj.benchmarks = null
    }

    const result = compareOutputSchema.safeParse(parsed)
    if (result.success) return result.data
    correction = result.error.issues
      .slice(0, 6)
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
  }
  throw new Error(`Schema validation failed after 2 attempts:\n${correction}`)
}

// ── DB write ─────────────────────────────────────────────────────────────────

async function writePair(pair: Pair, content: CompareOutput): Promise<void> {
  const supa = getAdminClient()
  const now = new Date().toISOString()
  const { error } = await supa.from('tool_comparisons').insert({
    tool_ids: [pair.tool_a.id, pair.tool_b.id],
    slug: pair.pair_slug,
    is_editorial: true,
    published_at: now,
    last_reviewed_at: now,
    tldr: content.tldr,
    verdict: content.verdict,
    feature_analysis: content.feature_analysis,
    pricing_analysis: content.pricing_analysis,
    use_cases: content.use_cases,
    benchmarks: content.benchmarks,
    faqs: content.faqs,
  } as never)
  if (error) {
    if (error.code === '23505') {
      // Unique-violation on slug — race with another instance or
      // already-existing row not surfaced by our pre-check. Treat as
      // skip-existing rather than fail.
      throw new Error(`SLUG_EXISTS:${pair.pair_slug}`)
    }
    throw new Error(`DB insert: ${error.message}`)
  }
}

// ── Concurrency runner ──────────────────────────────────────────────────────

async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Progress checkpoint ─────────────────────────────────────────────────────

function loadProgress(): Progress {
  if (!existsSync(PROGRESS_FILE)) return { processed: [], failed: [], skipped_existing: [] }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opps = loadOpportunities()
  console.log(`Loaded ${opps.length} opportunities from ${OPPS_FILE}`)
  console.log(`  compare-bucket subset: ${opps.filter((o) => o.page_type === 'compare').length}`)

  const tools = await fetchPublishedTools()
  console.log(`Loaded ${tools.length} published tools`)
  const toolsBySlug = new Map(tools.map((t) => [t.slug, t]))
  const nameIndex = buildNameIndex(tools)

  // Score + select top 300
  const scoreMap = scoreToolsByCompareBucket(opps)
  const sorted = [...tools].sort((a, b) => {
    const sa = scoreMap.get(a.slug) ?? 0
    const sb = scoreMap.get(b.slug) ?? 0
    if (sb !== sa) return sb - sa
    return (b.view_count ?? 0) - (a.view_count ?? 0)
  })
  let cohort = sorted.slice(0, TOP_TOOLS)
  if (targetSlug) cohort = sorted.filter((t) => t.slug === targetSlug)

  console.log(`Cohort: ${cohort.length} tools (top ${TOP_TOOLS} by compare-score, view_count fallback)`)

  // Build pairs
  const pairsByTool = buildDataDrivenPairs(cohort, opps, nameIndex)
  const dataPairCount = [...pairsByTool.values()].reduce((s, ps) => s + ps.length, 0)
  console.log(`Data-driven pairs: ${dataPairCount}`)

  await fillCatalogFallback(cohort, pairsByTool, toolsBySlug)
  const totalAfterFallback = [...pairsByTool.values()].reduce((s, ps) => s + ps.length, 0)
  console.log(`After catalog fallback: ${totalAfterFallback} pairs`)

  let allPairs = dedupAndCap(pairsByTool)
  if (limit) allPairs = allPairs.slice(0, limit)
  console.log(`After global dedup + cap: ${allPairs.length} unique pairs (max ${MAX_PAIRS})`)

  // Filter against existing editorial slugs
  const existing = await fetchExistingEditorialSlugs()
  const todoPairs = allPairs.filter((p) => !existing.has(p.pair_slug))
  const skippedCount = allPairs.length - todoPairs.length
  console.log(`Skipped (already exists): ${skippedCount}`)
  console.log(`To generate: ${todoPairs.length}`)
  console.log('')

  if (isDryRun) {
    console.log('Top 20 pairs that would be generated:')
    for (const p of todoPairs.slice(0, 20)) {
      console.log(
        `  · ${p.pair_slug.padEnd(50)} | score ${String(p.source_score).padStart(5)} | ${p.origin}`
      )
    }
    console.log('')
    console.log(`Re-run with --apply to generate. Estimated cost: ~$${(todoPairs.length * 0.005).toFixed(2)} DeepSeek.`)
    return
  }

  // ── APPLY ───
  const progress = loadProgress()
  const stillTodo = todoPairs.filter((p) => !progress.processed.includes(p.pair_slug))
  console.log(`Resuming: ${progress.processed.length} done, ${stillTodo.length} remaining\n`)

  let done = 0
  let failures = 0
  await pMap(stillTodo, CONCURRENCY, async (pair) => {
    try {
      const myOpps = opps.filter(
        (o) =>
          o.page_type === 'compare' &&
          (o.tool_slug === pair.slug_a || o.tool_slug === pair.slug_b) &&
          o.target_keyword.toLowerCase().includes(pair.tool_a.name.toLowerCase()) &&
          o.target_keyword.toLowerCase().includes(pair.tool_b.name.toLowerCase())
      )
      const scoreContext = myOpps[0]
        ? `users search "${myOpps[0].target_keyword}" (combined_score ${myOpps[0].combined_score})`
        : undefined
      const content = await generatePairContent(pair, scoreContext)
      await writePair(pair, content)
      progress.processed.push(pair.pair_slug)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.startsWith('SLUG_EXISTS:')) {
        progress.skipped_existing.push(pair.pair_slug)
      } else {
        progress.failed.push({ slug: pair.pair_slug, error: msg.slice(0, 300) })
        failures += 1
        console.error(`  ✗ ${pair.pair_slug} — ${msg.slice(0, 200)}`)
      }
    }
    done += 1
    if (done % 20 === 0) {
      saveProgress(progress)
      console.log(
        `  · ${done}/${stillTodo.length} done — ${progress.processed.length} written, ${failures} failed, ${progress.skipped_existing.length} skipped`
      )
    }
  })
  saveProgress(progress)

  console.log('')
  console.log(`✓ Complete.`)
  console.log(`  Written:           ${progress.processed.length}`)
  console.log(`  Skipped (existed): ${progress.skipped_existing.length}`)
  console.log(`  Failed:            ${progress.failed.length}`)
  if (progress.failed.length > 0) {
    console.log('')
    console.log('Failure samples (first 5):')
    for (const f of progress.failed.slice(0, 5)) {
      console.log(`  · ${f.slug}: ${f.error.slice(0, 120)}`)
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
