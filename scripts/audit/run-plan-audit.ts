/**
 * Plan-flow audit runner (Step 48.1 + 49.5).
 *
 * Hits /api/plan once per fixture prompt, captures the NDJSON stream,
 * grades the response against the fixture's expectations, and writes a
 * structured per-prompt report.
 *
 * Usage:
 *   tsx scripts/audit/run-plan-audit.ts                # all 200 prompts
 *   tsx scripts/audit/run-plan-audit.ts --bucket=CONSOLIDATABLE
 *   tsx scripts/audit/run-plan-audit.ts --limit=10 --bucket=BROKEN_FRAGMENTARY
 *   tsx scripts/audit/run-plan-audit.ts --base=https://rightaichoice.com
 *   tsx scripts/audit/run-plan-audit.ts --out=./audit-2026-04-26.json
 *
 * Pacing: /api/plan rate-limits to 5 req/min/IP. The runner sleeps
 * --delay-ms (default 13000) between prompts to stay under the limit.
 *
 * Output:
 *   - audit-results.json  — per-prompt records + bucket summaries
 *   - stdout              — running tally
 */
import { FIXTURE, FIXTURE_BY_BUCKET, type FixturePrompt, type FixtureBucket } from './plan-fixture'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

type StageOutline = {
  id: string
  name: string
  description: string
  why: string
  matchTier: 'keyword' | 'category_fallback' | 'emergency'
  capabilities?: string[]
  pricingNote?: string
  tools: Array<{ slug: string; name: string; tagline: string }>
}

type OutlineEvent = {
  type: 'outline'
  title: string
  summary: string
  stages: StageOutline[]
}

type EnrichedEvent = {
  type: 'enriched'
  stages: Array<StageOutline & { tools: Array<{ slug: string; whyForYou?: string; matchScore?: number }> }>
}

type DoneEvent = {
  type: 'done'
  _timings: Record<string, number>
}

type ErrorEvent = {
  type: 'error'
  status: number
  message: string
}

type PlanEvent = OutlineEvent | EnrichedEvent | DoneEvent | ErrorEvent

type Grade = {
  passed: boolean
  failures: string[]
  warnings: string[]
}

type Result = {
  fixture: FixturePrompt
  ok: boolean
  http_status: number
  error?: string
  outline?: OutlineEvent
  enriched_received: boolean
  done?: DoneEvent
  observed: {
    stage_count: number
    consolidated_to_single: boolean
    match_tiers: string[]
    has_capabilities_anywhere: boolean
    has_pricing_note_anywhere: boolean
    all_slugs: string[]
    gate_ran: boolean
    gate_passed: boolean
    regenerated: boolean
    total_ms: number | null
  }
  grade: Grade
}

function parseArgs(): {
  bucket: FixtureBucket | null
  limit: number | null
  base: string
  out: string
  delayMs: number
} {
  const args = process.argv.slice(2)
  const get = (key: string, def?: string) => {
    const m = args.find((a) => a.startsWith(`--${key}=`))
    return m ? m.split('=').slice(1).join('=') : def
  }
  return {
    bucket: (get('bucket') as FixtureBucket) || null,
    limit: get('limit') ? Number(get('limit')) : null,
    base: get('base', 'http://localhost:3000')!,
    out: get('out', resolve(process.cwd(), 'audit-results.json'))!,
    delayMs: Number(get('delay-ms', '13000')),
  }
}

function selectFixtures(bucket: FixtureBucket | null, limit: number | null): FixturePrompt[] {
  const base = bucket ? FIXTURE_BY_BUCKET[bucket] : FIXTURE
  return limit ? base.slice(0, limit) : base
}

async function callPlan(base: string, prompt: string): Promise<{
  status: number
  events: PlanEvent[]
  raw: string
}> {
  const res = await fetch(`${base}/api/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: prompt }),
  })
  const raw = await res.text()
  const events: PlanEvent[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed) as PlanEvent)
    } catch {
      // ignore malformed lines (shouldn't happen with NDJSON)
    }
  }
  return { status: res.status, events, raw }
}

function grade(fixture: FixturePrompt, observed: Result['observed'], outline: OutlineEvent | undefined): Grade {
  const failures: string[] = []
  const warnings: string[] = []

  if (!outline) {
    failures.push('no_outline_received')
    return { passed: false, failures, warnings }
  }

  // Stage count within expected range.
  if (observed.stage_count < fixture.expected_stages.min) {
    failures.push(`stage_count_too_low (${observed.stage_count} < ${fixture.expected_stages.min})`)
  } else if (observed.stage_count > fixture.expected_stages.max) {
    failures.push(`stage_count_too_high (${observed.stage_count} > ${fixture.expected_stages.max})`)
  }

  // Consolidation expectation.
  if (fixture.expected_consolidation === 'single' && !observed.consolidated_to_single) {
    failures.push('expected_single_stage_got_multi')
  }
  if (fixture.expected_consolidation === 'multi' && observed.consolidated_to_single) {
    failures.push('expected_multi_got_single')
  }

  // Empty stage detection.
  if (outline.stages.some((s) => s.tools.length === 0)) {
    failures.push('empty_stage_detected')
  }

  // Credible primary tool check (loose: at least one credible tool present in stack).
  const credible = fixture.credible_primary_tools.map((s) => s.toLowerCase())
  const hit = observed.all_slugs.some((s) => credible.includes(s.toLowerCase()))
  if (credible.length > 0 && !hit) {
    warnings.push(`no_credible_primary_tool — expected one of ${credible.join('/')}, got ${observed.all_slugs.slice(0, 5).join(',')}`)
  }

  // Required goals (multi-goal coverage).
  if (fixture.required_goals && fixture.required_goals.length > 0) {
    const haystack = (outline.title + ' ' + outline.summary + ' ' + outline.stages.map((s) => s.name + ' ' + s.description).join(' ')).toLowerCase()
    for (const goal of fixture.required_goals) {
      const tokens = goal.toLowerCase().split(/\s+/).filter((t) => t.length > 3)
      const matched = tokens.length === 0 ? true : tokens.some((t) => haystack.includes(t))
      if (!matched) warnings.push(`goal_possibly_dropped: "${goal}"`)
    }
  }

  // Single-stage stacks should typically advertise capabilities or pricing.
  if (observed.consolidated_to_single && !observed.has_capabilities_anywhere && !observed.has_pricing_note_anywhere) {
    warnings.push('single_stage_missing_capabilities_and_pricing_note')
  }

  return { passed: failures.length === 0, failures, warnings }
}

function summarize(fixture: FixturePrompt, status: number, events: PlanEvent[]): Result {
  const error = events.find((e): e is ErrorEvent => e.type === 'error')
  const outline = events.find((e): e is OutlineEvent => e.type === 'outline')
  const enriched = events.find((e): e is EnrichedEvent => e.type === 'enriched')
  const done = events.find((e): e is DoneEvent => e.type === 'done')

  const stages = outline?.stages ?? []
  const stage_count = stages.length
  const consolidated_to_single = stage_count === 1
  const match_tiers = stages.map((s) => s.matchTier)
  const has_capabilities_anywhere = stages.some((s) => Array.isArray(s.capabilities) && s.capabilities.length > 0)
  const has_pricing_note_anywhere = stages.some((s) => typeof s.pricingNote === 'string' && s.pricingNote.length > 0)
  const all_slugs = stages.flatMap((s) => s.tools.map((t) => t.slug))
  const gate_ran = (done?._timings?.gate_ran ?? 0) === 1
  const gate_passed = (done?._timings?.gate_passed ?? 1) === 1
  const regenerated = (done?._timings?.regenerated ?? 0) === 1
  const total_ms = done?._timings?.total_ms ?? null

  const observed = {
    stage_count,
    consolidated_to_single,
    match_tiers,
    has_capabilities_anywhere,
    has_pricing_note_anywhere,
    all_slugs,
    gate_ran,
    gate_passed,
    regenerated,
    total_ms,
  }

  const ok = !error && status >= 200 && status < 300 && !!outline
  return {
    fixture,
    ok,
    http_status: status,
    error: error?.message,
    outline,
    enriched_received: !!enriched,
    done,
    observed,
    grade: grade(fixture, observed, outline),
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const opts = parseArgs()
  const fixtures = selectFixtures(opts.bucket, opts.limit)
  console.log(`[audit] ${fixtures.length} prompts → ${opts.base}/api/plan, ${opts.delayMs}ms delay, → ${opts.out}`)

  const results: Result[] = []
  let i = 0
  for (const fixture of fixtures) {
    i += 1
    const t0 = Date.now()
    let result: Result
    try {
      const { status, events } = await callPlan(opts.base, fixture.prompt)
      result = summarize(fixture, status, events)
    } catch (err) {
      result = {
        fixture,
        ok: false,
        http_status: 0,
        error: err instanceof Error ? err.message : String(err),
        enriched_received: false,
        observed: {
          stage_count: 0,
          consolidated_to_single: false,
          match_tiers: [],
          has_capabilities_anywhere: false,
          has_pricing_note_anywhere: false,
          all_slugs: [],
          gate_ran: false,
          gate_passed: false,
          regenerated: false,
          total_ms: null,
        },
        grade: { passed: false, failures: ['network_error'], warnings: [] },
      }
    }
    results.push(result)
    const elapsed = Date.now() - t0
    const verdict = result.grade.passed ? 'PASS' : `FAIL[${result.grade.failures.join(',')}]`
    const warn = result.grade.warnings.length ? ` ⚠${result.grade.warnings.length}` : ''
    console.log(`[${i}/${fixtures.length}] ${fixture.id} ${verdict}${warn} (${elapsed}ms, stages=${result.observed.stage_count}, gate=${result.observed.gate_ran ? (result.observed.gate_passed ? 'pass' : 'fail+retry') : 'skip'})`)

    if (i < fixtures.length) await sleep(opts.delayMs)
  }

  // Bucket-level summaries.
  const byBucket: Record<string, { total: number; passed: number; failed: number; warned: number }> = {}
  for (const r of results) {
    const b = r.fixture.bucket
    byBucket[b] ??= { total: 0, passed: 0, failed: 0, warned: 0 }
    byBucket[b].total += 1
    if (r.grade.passed) byBucket[b].passed += 1
    else byBucket[b].failed += 1
    if (r.grade.warnings.length > 0) byBucket[b].warned += 1
  }

  const summary = {
    started_at: new Date().toISOString(),
    base: opts.base,
    bucket_filter: opts.bucket,
    total: results.length,
    passed: results.filter((r) => r.grade.passed).length,
    failed: results.filter((r) => !r.grade.passed).length,
    by_bucket: byBucket,
    gate_stats: {
      ran: results.filter((r) => r.observed.gate_ran).length,
      passed: results.filter((r) => r.observed.gate_ran && r.observed.gate_passed).length,
      failed_then_retried: results.filter((r) => r.observed.regenerated).length,
    },
    consolidation_stats: {
      single_stage: results.filter((r) => r.observed.consolidated_to_single).length,
      multi_stage: results.filter((r) => !r.observed.consolidated_to_single && r.observed.stage_count > 0).length,
    },
  }

  writeFileSync(opts.out, JSON.stringify({ summary, results }, null, 2))
  console.log('\n=== Summary ===')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`\n[audit] wrote ${opts.out}`)
}

main().catch((err) => {
  console.error('[audit] fatal:', err)
  process.exit(1)
})
