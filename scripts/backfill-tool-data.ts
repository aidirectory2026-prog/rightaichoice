/**
 * Phase 4a: backfill the 8 Phase-3 density columns for every published tool.
 *
 * Targets (from migration 073):
 *   - skip_if               text       — single-sentence "Skip [Tool] if …"
 *   - hidden_costs          text[]     — overage rates, contract minimums, paywalls
 *   - pricing_power_text    text       — stage / team-size sweet spot vs. peers
 *   - workflow_scenarios    jsonb      — [{persona, scenario, outcome}] (2-3 items)
 *   - setup_time_text       text       — per-persona ETA to first value
 *   - migration_in          text[]     — how to import data from common predecessors
 *   - migration_out         text[]     — how to export data to common successors
 *   - recent_changes        text[]     — material changes (pricing/brand/ownership)
 *
 * Strategy: synthesize from existing tool fields (description, features,
 * pricing_details, limitations, use_cases, best_for, not_for, integrations,
 * editorial_verdict). NO new vendor scraping in this pass — that's the
 * Phase 4b freshness pass. This keeps Phase 4a cheap, predictable, and
 * doesn't depend on flaky third-party site availability.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/backfill-tool-data.ts --dry-run --batch=5
 *   tsx --env-file=.env.local scripts/backfill-tool-data.ts --dry-run --slug=kit
 *   tsx --env-file=.env.local scripts/backfill-tool-data.ts --apply --batch=20
 *   tsx --env-file=.env.local scripts/backfill-tool-data.ts --apply         # all tools (resumes via checkpoint)
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Cost estimate: ~$0.04 per tool (Sonnet 4.6 single call, ~3K input + 1.5K output).
 * Full catalog (~1,212 tools) ≈ $50.
 *
 * Checkpoint: writes processed slugs to scripts/.backfill-progress.json after
 * each tool, so re-runs (with or without --apply) skip already-processed tools.
 *
 * Smart safe minimum: when Claude returns INSUFFICIENT_DATA for a field, the
 * script writes a minimal category-default value AND appends to
 * docs/preflight/needs_manual_review.txt with "<slug> | <field> | low_confidence".
 *
 * Phase 4a hard rule: never sets is_published=false. Every published tool
 * stays published. Smart safe minimum + log instead.
 */
export {}

import { writeFileSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { z } from 'zod'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { getAnthropicClient } from '../lib/ai/anthropic'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.backfill-progress.json')
const REVIEW_LOG = join(process.cwd(), 'docs', 'preflight', 'needs_manual_review.txt')
const MODEL = 'claude-sonnet-4-6'

// ── Output schema ────────────────────────────────────────────────────────────

const densityFieldsSchema = z.object({
  skip_if: z.string().max(220),
  hidden_costs: z.array(z.string().max(220)).min(0).max(6),
  pricing_power_text: z.string().max(500),
  workflow_scenarios: z
    .array(
      z.object({
        persona: z.string().max(60),
        scenario: z.string().max(280),
        outcome: z.string().max(180),
      })
    )
    .min(2)
    .max(3),
  setup_time_text: z.string().max(400),
  migration_in: z.array(z.string().max(220)).min(0).max(5),
  migration_out: z.array(z.string().max(220)).min(0).max(5),
  recent_changes: z.array(z.string().max(280)).min(0).max(4),
})

type DensityFields = z.infer<typeof densityFieldsSchema>

// ── Argument parsing ─────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const APPLY = argv.includes('--apply')
const BATCH = (() => {
  const flag = argv.find((a) => a.startsWith('--batch='))
  return flag ? Math.max(1, parseInt(flag.split('=')[1], 10) || 0) : null
})()
const ONE_SLUG = argv.find((a) => a.startsWith('--slug='))?.split('=')[1] ?? null
const FORCE = argv.includes('--force') // ignore checkpoint

if (!DRY_RUN && !APPLY) {
  console.error('Specify either --dry-run or --apply (refusing to run with neither).')
  process.exit(1)
}
if (DRY_RUN && APPLY) {
  console.error('--dry-run and --apply are mutually exclusive.')
  process.exit(1)
}

// ── Tool row shape (only the fields we read or write) ────────────────────────

type ToolRow = {
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
  limitations: string | null
  editorial_verdict: string | null
  // Phase 3 columns we're filling — read so we can detect already-populated tools
  skip_if: string | null
  hidden_costs: string[] | null
  pricing_power_text: string | null
  workflow_scenarios: unknown
  setup_time_text: string | null
  migration_in: string[] | null
  migration_out: string[] | null
  recent_changes: string[] | null
}

// ── Checkpoint file ──────────────────────────────────────────────────────────

function loadCheckpoint(): Set<string> {
  if (!existsSync(PROGRESS_FILE)) return new Set()
  try {
    const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')) as { processed: string[] }
    return new Set(data.processed)
  } catch {
    return new Set()
  }
}

function saveCheckpoint(processed: Set<string>) {
  mkdirSync(dirname(PROGRESS_FILE), { recursive: true })
  writeFileSync(PROGRESS_FILE, JSON.stringify({ processed: [...processed] }, null, 2))
}

function logForReview(slug: string, field: string, reason: string) {
  mkdirSync(dirname(REVIEW_LOG), { recursive: true })
  const line = `${slug} | ${field} | ${reason} (Phase 4a backfill)\n`
  appendFileSync(REVIEW_LOG, line)
}

// ── Claude prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are filling the eight density-replacement fields on a tool detail page for RightAIChoice — a decision-support platform users read before adopting a tool. Depth and honesty matter more than marketing gloss. Ground every output in the provided tool context — never invent specifics. If a field genuinely cannot be answered from the context, return the literal string "INSUFFICIENT_DATA" for that field (the script will fall back to a smart safe minimum + log it for manual review).

Voice rules:
- Plain English, RAC editorial. No vendor superlatives ("powerful", "industry-leading", "next-generation", "seamless").
- Speak directly to the buyer ("you", not "users").
- Cite specific tool features when justifying a claim — never wave at "this product is great".

Field-by-field guidance:

1. skip_if (string, max 220 chars, single sentence): "Skip [Tool] if you …" — the most honest disqualifier. Tied to actual limitations or missing capabilities. NOT generic ("if you don't need automation"). Specific ("if you need self-hosting" / "if your team uses Linear and you can't justify another tool" / "if you've already standardized on HubSpot").

2. hidden_costs (string[], 0-6 items, each max 220 chars): overage rates, contract minimums, mid-tier paywalls, surprise add-ons. Each item is a concrete dollar / behavior fact, not a complaint. Example: "Email sends above 25,000/mo billed at $0.0008/send on Free tier." Empty array if pricing is straightforward (free tools, fully transparent flat-rate).

3. pricing_power_text (string, max 500 chars, prose): at which company stage / team size the pricing actually pencils out vs. peers. Mention 1-2 named alternatives with the comparison ("under 5K subscribers, Beehiiv's free tier wins; over 25K, Kit's per-subscriber pricing beats Beehiiv's tiers").

4. workflow_scenarios (array of 2-3 {persona, scenario, outcome}):
   - persona: short label, e.g. "Solo creator" / "10-person agency" / "Series-B SaaS marketing team"
   - scenario: 1-2 sentences describing the concrete day-one workflow ("You import your existing 1,200-subscriber list from Substack, set up a welcome sequence, and connect your Stripe account for paid posts.")
   - outcome: short outcome line ("Live newsletter in ~2 hours; first paid post live same day.")

5. setup_time_text (string, max 400 chars, prose): per-persona ETA to first value. Example: "Solo creator: ~30 min to first email sent; small team (5-15): a half day with a bulk import; agency or 10K+ list: 1-2 days including domain auth + segment migration."

6. migration_in (string[], 0-5 items): how to bring data IN from common predecessors. Each item: "From [Predecessor]: [specific path]." Example: "From Mailchimp: native CSV import + automation re-build (no direct connector for Mailchimp's automation graph)."

7. migration_out (string[], 0-5 items): how to export OUT to common successors. Example: "To Beehiiv: CSV subscriber export + manual list re-import; automations don't transfer."

8. recent_changes (string[], 0-4 items, most recent first): material changes worth knowing — pricing changes, brand changes, ownership changes, deprecations. Each item dated if known: "2026-Q1 — removed the $9 Personal tier; cheapest paid plan is now $25/mo." Empty array if nothing material in the last 12 months.

Return STRICT JSON matching this exact shape. No prose around the JSON, no code fences, no commentary.`

const responseShape = `{
  "skip_if": "...",
  "hidden_costs": ["...", "..."],
  "pricing_power_text": "...",
  "workflow_scenarios": [{"persona": "...", "scenario": "...", "outcome": "..."}, ...],
  "setup_time_text": "...",
  "migration_in": ["...", "..."],
  "migration_out": ["...", "..."],
  "recent_changes": ["...", "..."]
}`

function buildUserPrompt(tool: ToolRow): string {
  const safe = (v: unknown) => (v == null || v === '' ? '(none on file)' : v)
  const arr = (a: unknown) => (Array.isArray(a) && a.length > 0 ? a.join(', ') : '(none on file)')
  return `Tool name: ${tool.name}
Slug: ${tool.slug}
Tagline: ${safe(tool.tagline)}

Description:
${safe(tool.description)}

Pricing type: ${safe(tool.pricing_type)}
Pricing details (JSON): ${JSON.stringify(tool.pricing_details ?? null)}

Features: ${arr(tool.features)}
Integrations: ${arr(tool.integrations)}
Use cases: ${arr(tool.use_cases)}
Best for: ${arr(tool.best_for)}
Not ideal for: ${arr(tool.not_for)}
Limitations: ${safe(tool.limitations)}

Existing editorial verdict (for tone reference, do not duplicate):
${safe(tool.editorial_verdict)}

Return STRICT JSON of this exact shape. Use the literal string "INSUFFICIENT_DATA" for any individual top-level field you genuinely cannot answer. Arrays may be empty when the field truly does not apply (e.g. recent_changes for a brand-new tool).

Shape:
${responseShape}`
}

// ── Smart safe minimum (per-field fallback when Claude returns INSUFFICIENT_DATA) ──

function smartSafeMinimum(field: keyof DensityFields, tool: ToolRow): unknown {
  switch (field) {
    case 'skip_if':
      return `you need capabilities ${tool.name} doesn't currently advertise — review the limitations and pricing tiers above before adopting.`
    case 'hidden_costs':
      return []
    case 'pricing_power_text':
      return `${tool.name}'s pricing fits teams whose volume aligns with the published tiers. Compare against the alternatives listed below for stage-specific value.`
    case 'workflow_scenarios':
      return [
        { persona: 'Solo user', scenario: `Sign up for ${tool.name}, follow the onboarding, and complete one core workflow end-to-end.`, outcome: 'First useful output produced in the first session.' },
        { persona: 'Small team', scenario: `Invite teammates after the solo workflow above. Establish shared conventions and connect the team's existing tools listed in the Integrations section.`, outcome: 'Team onboarded with consistent usage patterns.' },
      ]
    case 'setup_time_text':
      return `Setup time varies by use case. Solo users typically reach first value within an hour; teams should budget half a day for shared setup including integrations and access controls.`
    case 'migration_in':
      return []
    case 'migration_out':
      return []
    case 'recent_changes':
      return []
  }
}

// ── Per-tool synthesis ───────────────────────────────────────────────────────

async function synthesizeTool(tool: ToolRow): Promise<DensityFields> {
  const client = getAnthropicClient()
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(tool) }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response')
  }
  const raw = textBlock.text.trim()

  // Strip code fences if model wrapped output
  const json = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    throw new Error(`Claude returned non-JSON output:\n${raw.slice(0, 500)}`)
  }

  // Replace any "INSUFFICIENT_DATA" with smart safe minimum + log per field
  const obj = parsed as Record<string, unknown>
  for (const field of Object.keys(densityFieldsSchema.shape) as (keyof DensityFields)[]) {
    if (obj[field] === 'INSUFFICIENT_DATA') {
      obj[field] = smartSafeMinimum(field, tool)
      logForReview(tool.slug, field, 'claude_returned_insufficient_data')
    }
  }

  return densityFieldsSchema.parse(obj)
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : '[APPLY] '}Phase 4a backfill — 8 density columns.\n`)

  const supabase = getAdminClient()
  const checkpoint = FORCE ? new Set<string>() : loadCheckpoint()

  // Fetch published tools, optionally filtered by --slug; then trim by checkpoint + batch
  let q = supabase
    .from('tools')
    .select(
      'id, slug, name, tagline, description, pricing_type, pricing_details, features, integrations, use_cases, best_for, not_for, limitations, editorial_verdict, skip_if, hidden_costs, pricing_power_text, workflow_scenarios, setup_time_text, migration_in, migration_out, recent_changes'
    )
    .eq('is_published', true)
    .order('view_count', { ascending: false })

  if (ONE_SLUG) q = q.eq('slug', ONE_SLUG)

  const { data, error } = await q
  if (error) {
    console.error('DB read failed:', error.message)
    process.exit(1)
  }
  const allRows = (data ?? []) as unknown as ToolRow[]
  if (allRows.length === 0) {
    console.error('No matching published tools found.')
    process.exit(1)
  }

  // Skip checkpointed tools (unless --force or --slug)
  const candidates = ONE_SLUG ? allRows : allRows.filter((r) => !checkpoint.has(r.slug))
  const toProcess = BATCH ? candidates.slice(0, BATCH) : candidates

  console.log(
    `Total published: ${allRows.length} | already processed: ${checkpoint.size} | will process this run: ${toProcess.length}\n`
  )

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const [i, tool] of toProcess.entries()) {
    const prefix = `[${i + 1}/${toProcess.length}] ${tool.slug}`
    try {
      const fields = await synthesizeTool(tool)

      if (DRY_RUN) {
        console.log(`${prefix} — synthesized:`)
        console.log(`  skip_if:             ${fields.skip_if}`)
        console.log(`  hidden_costs (${fields.hidden_costs.length}): ${fields.hidden_costs.slice(0, 2).join(' | ')}${fields.hidden_costs.length > 2 ? ' …' : ''}`)
        console.log(`  pricing_power_text:  ${fields.pricing_power_text.slice(0, 120)}${fields.pricing_power_text.length > 120 ? '…' : ''}`)
        console.log(`  workflow_scenarios:  ${fields.workflow_scenarios.length} scenarios (personas: ${fields.workflow_scenarios.map((s) => s.persona).join(', ')})`)
        console.log(`  setup_time_text:     ${fields.setup_time_text.slice(0, 120)}${fields.setup_time_text.length > 120 ? '…' : ''}`)
        console.log(`  migration_in (${fields.migration_in.length}) | migration_out (${fields.migration_out.length}) | recent_changes (${fields.recent_changes.length})`)
        console.log('')
        skipped++
        continue
      }

      // APPLY: write the eight columns + last_verified_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateBuilder = (supabase.from('tools') as any).update({
        ...fields,
        last_verified_at: new Date().toISOString(),
      })
      const { error: updErr } = await updateBuilder.eq('id', tool.id)
      if (updErr) {
        console.log(`${prefix} ✗ DB update failed: ${updErr.message}`)
        failed++
        continue
      }

      checkpoint.add(tool.slug)
      saveCheckpoint(checkpoint)
      console.log(`${prefix} ✓ updated`)
      ok++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`${prefix} ✗ synthesis failed: ${msg.slice(0, 200)}`)
      logForReview(tool.slug, 'all_density_fields', `synthesis_error: ${msg.slice(0, 100)}`)
      failed++
    }
  }

  console.log('\n──────────────────────────────────────────')
  if (DRY_RUN) {
    console.log(`Dry-run: ${skipped} synthesized (no DB writes), ${failed} failed.`)
  } else {
    console.log(`Apply: ${ok} updated, ${failed} failed. Checkpoint: ${checkpoint.size} processed total.`)
  }
  console.log('──────────────────────────────────────────\n')
  process.exit(failed > 0 && !DRY_RUN ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
