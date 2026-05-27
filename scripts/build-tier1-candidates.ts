/**
 * Phase 9 (2026-05-27) — Tier-1 candidate list.
 *
 * Pulls the latest 28d gsc_snapshot, groups by page, and emits the 101
 * pages currently sitting at positions 1–30 — the "earn the click" cohort
 * where a smarter <title> + meta description has the biggest lift potential
 * with zero content work.
 *
 * Output buckets:
 *   1A — position 1–10  (earn the click; CTR ceiling, snippet hunt)
 *   1B — position 11–20 (break onto page 1; title urgency)
 *   1C — position 21–30 (push into top 20; title + intent realignment)
 *
 * USAGE:
 *   npm run tier1:candidates              # writes candidates/tier1-candidates.json
 *   npm run tier1:candidates -- --dry     # print summary only
 *   npm run tier1:candidates -- --scope=7d  # use 7d snapshot instead of 28d
 *
 * The output JSON joins each page with the matching <title> currently
 * served in production (best-effort, via a single HEAD-then-GET on the
 * canonical URL — capped to N concurrent for politeness). When the title
 * fetch fails (404, timeout), the row is still emitted with title:null so
 * the operator can hand-fill it in /admin/tier1-review.
 *
 * REQUIRED ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { getAdminClient } from '../lib/cron/supabase-admin'

const BASE_URL = 'https://rightaichoice.com'
const OUT_PATH = resolve(process.cwd(), 'candidates/tier1-candidates.json')
const MAX_TITLE_FETCH_CONCURRENCY = 6
const TITLE_FETCH_TIMEOUT_MS = 8000

const args = process.argv.slice(2)
const isDry = args.includes('--dry') || args.includes('--dry-run')
const scopeArg = args.find((a) => a.startsWith('--scope='))
const scope = (scopeArg ? scopeArg.split('=')[1] : '28d') as '7d' | '28d'
const skipTitleFetch = args.includes('--no-titles')

type GscRow = {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type SnapshotRow = {
  id: string
  snapshot_date: string
  scope: '7d' | '28d'
  rows: GscRow[]
  rows_count: number
}

type Candidate = {
  page: string
  canonicalUrl: string
  currentTitle: string | null
  bucket: '1A' | '1B' | '1C'
  weightedPosition: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  topQuery: { query: string; impressions: number; position: number } | null
  queries: Array<{ query: string; impressions: number; clicks: number; position: number; ctr: number }>
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any

  console.log(`[tier1] loading latest ${scope} snapshot…`)
  const snapshot = await loadLatestSnapshot(supabase, scope)
  console.log(
    `[tier1] snapshot ${snapshot.snapshot_date} (${scope}) — ${snapshot.rows_count} (page, query) rows`,
  )

  const grouped = groupByPage(snapshot.rows)
  console.log(`[tier1] grouped into ${grouped.size} unique pages`)

  const candidates = Array.from(grouped.values())
    .filter((c) => c.weightedPosition >= 1 && c.weightedPosition <= 30)
    .sort((a, b) => b.totalImpressions - a.totalImpressions)

  console.log(`[tier1] ${candidates.length} candidates in positions 1–30`)
  const byBucket = countByBucket(candidates)
  console.log(`[tier1]   bucket 1A (pos 1–10):  ${byBucket['1A']} pages`)
  console.log(`[tier1]   bucket 1B (pos 11–20): ${byBucket['1B']} pages`)
  console.log(`[tier1]   bucket 1C (pos 21–30): ${byBucket['1C']} pages`)

  if (!skipTitleFetch) {
    console.log(`[tier1] fetching current <title> tags (concurrency=${MAX_TITLE_FETCH_CONCURRENCY})…`)
    await enrichWithTitles(candidates)
    const withTitles = candidates.filter((c) => c.currentTitle).length
    console.log(`[tier1]   ${withTitles}/${candidates.length} pages titled`)
  }

  if (isDry) {
    console.log('[tier1] dry-run: not writing')
    printTopPreview(candidates)
    return
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        snapshot_date: snapshot.snapshot_date,
        scope: snapshot.scope,
        totals: byBucket,
        candidates,
      },
      null,
      2,
    ),
    'utf-8',
  )
  console.log(`[tier1] wrote ${candidates.length} candidates → ${OUT_PATH}`)
  printTopPreview(candidates)
}

async function loadLatestSnapshot(supabase: any, scope: '7d' | '28d'): Promise<SnapshotRow> {
  const { data, error } = await supabase
    .from('gsc_snapshots')
    .select('id, snapshot_date, scope, rows, rows_count')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`loadLatestSnapshot: ${error.message}`)
  if (!data) throw new Error(`No gsc_snapshots row found for scope=${scope}`)
  return data as SnapshotRow
}

function groupByPage(rows: GscRow[]): Map<string, Candidate> {
  const map = new Map<string, Candidate>()

  for (const row of rows) {
    if (!row.page || !Number.isFinite(row.position)) continue
    const path = pathFromGscPage(row.page)
    if (!path) continue
    if (!isCandidatePath(path)) continue

    let candidate = map.get(path)
    if (!candidate) {
      candidate = {
        page: path,
        canonicalUrl: `${BASE_URL}${path}`,
        currentTitle: null,
        bucket: '1C',
        weightedPosition: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCtr: 0,
        topQuery: null,
        queries: [],
      }
      map.set(path, candidate)
    }

    candidate.totalImpressions += row.impressions
    candidate.totalClicks += row.clicks
    candidate.queries.push({
      query: row.query,
      impressions: row.impressions,
      clicks: row.clicks,
      position: row.position,
      ctr: row.ctr,
    })
  }

  for (const candidate of map.values()) {
    if (candidate.totalImpressions === 0) continue
    let weighted = 0
    for (const q of candidate.queries) {
      weighted += q.position * q.impressions
    }
    candidate.weightedPosition = +(weighted / candidate.totalImpressions).toFixed(2)
    candidate.avgCtr = +(candidate.totalClicks / candidate.totalImpressions).toFixed(4)
    candidate.bucket = bucketFor(candidate.weightedPosition)
    candidate.queries.sort((a, b) => b.impressions - a.impressions)
    candidate.queries = candidate.queries.slice(0, 10)
    candidate.topQuery = candidate.queries[0]
      ? {
          query: candidate.queries[0].query,
          impressions: candidate.queries[0].impressions,
          position: +candidate.queries[0].position.toFixed(2),
        }
      : null
  }

  return map
}

function bucketFor(position: number): '1A' | '1B' | '1C' {
  if (position <= 10) return '1A'
  if (position <= 20) return '1B'
  return '1C'
}

function pathFromGscPage(page: string): string | null {
  try {
    const u = new URL(page)
    return u.pathname || '/'
  } catch {
    return page.startsWith('/') ? page : null
  }
}

function isCandidatePath(path: string): boolean {
  // Exclude API, admin, dashboard, auth — internal stuff with no SEO value.
  if (path.startsWith('/api/')) return false
  if (path.startsWith('/admin')) return false
  if (path.startsWith('/dashboard')) return false
  if (path.startsWith('/auth')) return false
  if (path === '/' && false) return false // keep homepage; we'll handle it separately per doc 13
  return true
}

function countByBucket(candidates: Candidate[]): Record<'1A' | '1B' | '1C', number> {
  const out: Record<'1A' | '1B' | '1C', number> = { '1A': 0, '1B': 0, '1C': 0 }
  for (const c of candidates) out[c.bucket]++
  return out
}

async function enrichWithTitles(candidates: Candidate[]): Promise<void> {
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= candidates.length) return
      candidates[idx].currentTitle = await fetchTitle(candidates[idx].canonicalUrl)
    }
  }
  const workers = Array.from({ length: MAX_TITLE_FETCH_CONCURRENCY }, () => worker())
  await Promise.all(workers)
}

async function fetchTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TITLE_FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RightAIChoice-Tier1-Builder/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function printTopPreview(candidates: Candidate[]): void {
  console.log('')
  console.log('--- top 10 candidates by impression volume ---')
  for (const c of candidates.slice(0, 10)) {
    const tq = c.topQuery ? `"${c.topQuery.query}" @${c.topQuery.position}` : '—'
    console.log(
      `[${c.bucket}] pos ${c.weightedPosition.toString().padStart(5)} | ${String(c.totalImpressions).padStart(5)} impr | ${String(c.totalClicks).padStart(3)} clk | ctr ${(c.avgCtr * 100).toFixed(1).padStart(4)}% | ${c.page.padEnd(60)} → ${tq}`,
    )
  }
}

main().catch((err) => {
  console.error('[tier1] failed:', err)
  process.exit(1)
})
