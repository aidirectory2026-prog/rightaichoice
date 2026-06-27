/**
 * Phase 13 D1.1 — Originality-density audit (READ-ONLY).
 *
 * Scores every published tool + compare page on "original value density" and
 * buckets each as keep / enrich / consolidate (see lib/seo/originality-audit.ts).
 * Writes scripts/.originality-audit.json and prints a summary. No DB writes.
 *
 * USAGE:
 *   npx tsx --env-file=.env.local scripts/audit-originality.ts
 *   npx tsx --env-file=.env.local scripts/audit-originality.ts --limit=200
 *   npx tsx --env-file=.env.local scripts/audit-originality.ts --type=compare
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { loadDataset } from '../lib/geo/llms-dataset'
import {
  scoreTool,
  scoreCompare,
  tally,
  type AuditVerdict,
  type PageType,
} from '../lib/seo/originality-audit'

const OUTPUT_FILE = join(process.cwd(), 'scripts', '.originality-audit.json')
const INDEXATION_FILE = join(process.cwd(), 'scripts', '.gsc-indexation-report.json')
const PAGE_SIZE = 1000

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const typeArg = args.find((a) => a.startsWith('--type='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const onlyType = typeArg ? (typeArg.split('=')[1] as PageType) : undefined

function toPath(page: string): string {
  try {
    return new URL(page).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return page.replace(/\/+$/, '') || '/'
  }
}

/** path -> summed 28d impressions, from the latest scope='28d' gsc_snapshots row. */
async function loadImpressionsByPath(): Promise<Map<string, number>> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('gsc_snapshots')
    .select('snapshot_date, rows')
    .eq('scope', '28d')
    .order('snapshot_date', { ascending: false })
    .limit(1)
  if (error) throw new Error(`gsc_snapshots query failed: ${error.message}`)
  const snap = (data ?? [])[0] as { snapshot_date: string; rows: unknown } | undefined
  const byPath = new Map<string, number>()
  if (!snap) {
    console.warn('⚠️  No 28d gsc_snapshots row found — impressions default to 0.')
    return byPath
  }
  const rows = (snap.rows ?? []) as Array<{ page?: string; impressions?: number }>
  for (const r of rows) {
    if (!r.page) continue
    const p = toPath(r.page)
    byPath.set(p, (byPath.get(p) ?? 0) + (r.impressions ?? 0))
  }
  console.log(`GSC 28d snapshot ${snap.snapshot_date}: ${rows.length} rows, ${byPath.size} distinct paths`)
  return byPath
}

/** url -> coverageState from the optional indexation report dotfile. */
function loadCoverageByUrl(): Map<string, string> {
  const m = new Map<string, string>()
  if (!existsSync(INDEXATION_FILE)) return m
  try {
    const report = JSON.parse(readFileSync(INDEXATION_FILE, 'utf-8')) as {
      inspections?: Array<{ url: string; coverageState: string }>
    }
    for (const i of report.inspections ?? []) m.set(toPath(i.url), i.coverageState)
    console.log(`Indexation report: ${m.size} URLs with coverage state`)
  } catch {
    /* ignore malformed report */
  }
  return m
}

type CompareRow = {
  slug: string
  is_editorial: boolean | null
  verdict: string | null
  feature_analysis: string | null
  pricing_analysis: string | null
  tldr: unknown
  use_cases: unknown
  faqs: unknown
  benchmarks: unknown
  published_at: string | null
  last_reviewed_at: string | null
}

async function loadCompares(): Promise<CompareRow[]> {
  const db = getAdminClient()
  const all: CompareRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('tool_comparisons')
      .select(
        'slug, is_editorial, verdict, feature_analysis, pricing_analysis, tldr, use_cases, faqs, benchmarks, published_at, last_reviewed_at',
      )
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`tool_comparisons query failed: ${error.message}`)
    const rows = (data ?? []) as CompareRow[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

function arrLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0
}

function printType(label: string, verdicts: AuditVerdict[]) {
  const c = tally(verdicts)
  console.log(
    `  ${label.padEnd(9)} ${String(verdicts.length).padStart(5)} pages  →  ` +
      `keep ${String(c.keep).padStart(5)} · enrich ${String(c.enrich).padStart(5)} · consolidate ${String(c.consolidate).padStart(5)}`,
  )
}

function examples(verdicts: AuditVerdict[], bucket: string, n: number): AuditVerdict[] {
  return verdicts.filter((v) => v.bucket === bucket).slice(0, n)
}

async function main() {
  const wantTools = !onlyType || onlyType === 'tool'
  const wantCompares = !onlyType || onlyType === 'compare'

  const [impr, coverage] = await Promise.all([loadImpressionsByPath(), Promise.resolve(loadCoverageByUrl())])

  let toolVerdicts: AuditVerdict[] = []
  if (wantTools) {
    const ds = await loadDataset()
    let tools = ds.tools
    if (limit != null) tools = tools.slice(0, limit)
    toolVerdicts = tools.map((t) => {
      const url = `/tools/${t.slug}`
      return scoreTool({
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        pricing_type: t.pricing_type,
        viability_score: t.viability_score,
        github_stars: t.github_stars,
        last_verified_at: t.last_verified_at,
        categories: t.categories,
        impressions28d: impr.get(url) ?? 0,
        coverageState: coverage.get(url) ?? null,
      })
    })
  }

  let compareVerdicts: AuditVerdict[] = []
  if (wantCompares) {
    let compares = await loadCompares()
    if (limit != null) compares = compares.slice(0, limit)
    compareVerdicts = compares.map((c) => {
      const url = `/compare/${c.slug}`
      return scoreCompare({
        slug: c.slug,
        is_editorial: !!c.is_editorial,
        verdict: c.verdict,
        feature_analysis: c.feature_analysis,
        pricing_analysis: c.pricing_analysis,
        tldrLen: arrLen(c.tldr),
        useCasesLen: arrLen(c.use_cases),
        faqsLen: arrLen(c.faqs),
        benchmarksLen: arrLen(c.benchmarks),
        published_at: c.published_at,
        last_reviewed_at: c.last_reviewed_at,
        impressions28d: impr.get(url) ?? 0,
        coverageState: coverage.get(url) ?? null,
      })
    })
  }

  console.log('\n══════════════════════════════════════════════════════')
  console.log('  ORIGINALITY-DENSITY AUDIT')
  console.log('══════════════════════════════════════════════════════\n')
  if (wantTools) printType('tools', toolVerdicts)
  if (wantCompares) printType('compares', compareVerdicts)

  const all = [...toolVerdicts, ...compareVerdicts]
  for (const [label, list] of [
    ['tools', toolVerdicts],
    ['compares', compareVerdicts],
  ] as Array<[string, AuditVerdict[]]>) {
    if (list.length === 0) continue
    console.log(`\n  ${label} examples:`)
    for (const b of ['keep', 'enrich', 'consolidate']) {
      const ex = examples(list, b, 3)
      if (ex.length === 0) continue
      console.log(`    ${b}:`)
      for (const v of ex) console.log(`      ${v.url}  score=${v.score} impr=${v.impressions28d}`)
    }
  }

  const consolidate = all
    .filter((v) => v.bucket === 'consolidate')
    .sort((a, b) => a.score - b.score)
  console.log(`\n  Top consolidate candidates (thin + zero impressions): ${consolidate.length} total`)
  for (const v of consolidate.slice(0, 5)) {
    console.log(`    ${v.url}  score=${v.score}  [${v.reasons.join(', ')}]`)
  }

  const report = {
    generated_at: new Date().toISOString(),
    limit: limit ?? null,
    type_filter: onlyType ?? null,
    counts: {
      tools: wantTools ? tally(toolVerdicts) : null,
      compares: wantCompares ? tally(compareVerdicts) : null,
    },
    verdicts: all.sort((a, b) => a.score - b.score),
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2))
  console.log(`\nFull report: ${OUTPUT_FILE}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
