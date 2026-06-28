/**
 * Phase 7A.fallback — merge all keyword-mining sources into one
 * prioritized opportunity JSON for Phase 7B-7M consumers.
 *
 * Reads (when present):
 *   scripts/.gsc-opportunities.json      (Phase 7A — GSC)
 *   scripts/.suggest-opportunities.json  (Phase 7A.fb — Google Suggest)
 *   scripts/.reddit-opportunities.json   (Phase 7A.fb — Reddit/Apify)
 *   scripts/.quora-opportunities.json    (Phase 7A.fb — Quora/Apify)
 *
 * Writes:
 *   scripts/.keyword-opportunities.json  (the canonical merged file
 *                                         that 7B/7C/7D/7E/7L/7M read)
 *
 * Each source has its own est_volume_score scale, so we normalize to
 * a 0-100 weight per source, then combine with source priors:
 *   - GSC      weight 1.0 (real impressions data — most reliable)
 *   - Suggest  weight 0.7 (Google's autocomplete signal — implicit volume)
 *   - Reddit   weight 0.5 (community discussion — engagement proxy)
 *   - Quora    weight 0.4 (Q&A engagement — narrower audience than reddit)
 *
 * Within (tool_slug, page_type) groups, we sum the weighted scores
 * and dedup on target_keyword (case-insensitive). Final list is sorted
 * descending by combined score.
 *
 * USAGE:
 *   npm run mine:merge
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const SCRIPTS = join(process.cwd(), 'scripts')

const SOURCES: Array<{ file: string; key: SourceKey; weight: number }> = [
  { file: '.gsc-opportunities.json', key: 'gsc', weight: 1.0 },
  { file: '.suggest-opportunities.json', key: 'google-suggest', weight: 0.7 },
  { file: '.reddit-opportunities.json', key: 'reddit', weight: 0.5 },
  { file: '.quora-opportunities.json', key: 'quora', weight: 0.4 },
]

type SourceKey = 'gsc' | 'google-suggest' | 'reddit' | 'quora'
type PageType = 'compare' | 'alternative' | 'worth-it' | 'how-to' | 'use-case' | 'pricing' | 'unbucketed'

type RawOpportunity = {
  tool_slug: string
  page_type: PageType
  target_keyword: string
  source?: SourceKey
  est_volume_score?: number
  // Source-specific (kept for downstream consumers):
  current_position?: number
  impressions?: number
  clicks?: number
  ctr?: number
  suggestion_rank?: number
  seed_query?: string
  reddit_score?: number
  reddit_comments?: number
  subreddit?: string | null
  post_title?: string
  reddit_url?: string
  quora_answer_count?: number
  quora_follow_count?: number
  question_text?: string
  question_url?: string
  // Inherited from source file (when missing in the row itself):
  page_path?: string
}

type MergedOpportunity = RawOpportunity & {
  source: SourceKey
  combined_score: number
}

function loadSource(file: string): { opportunities: RawOpportunity[] } | null {
  const path = join(SCRIPTS, file)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

// Normalize the per-source raw scores to 0-100 within the source.
function normalize(opps: RawOpportunity[]): RawOpportunity[] {
  if (opps.length === 0) return opps
  const max = Math.max(...opps.map((o) => o.est_volume_score ?? 0))
  if (max === 0) return opps
  return opps.map((o) => ({
    ...o,
    est_volume_score: Math.round(((o.est_volume_score ?? 0) / max) * 1000) / 10,
  }))
}

function normalizeKeyword(k: string): string {
  return k.toLowerCase().trim().replace(/\s+/g, ' ')
}

function main() {
  const all: MergedOpportunity[] = []
  const sourceTotals: Record<SourceKey, number> = {
    gsc: 0,
    'google-suggest': 0,
    reddit: 0,
    quora: 0,
  }
  const presentSources: SourceKey[] = []

  for (const { file, key, weight } of SOURCES) {
    const data = loadSource(file)
    if (!data) {
      console.log(`  · ${key.padEnd(15)} — file not found (${file}), skipping`)
      continue
    }
    presentSources.push(key)
    const normalized = normalize(data.opportunities)
    for (const o of normalized) {
      all.push({
        ...o,
        source: key,
        combined_score: Math.round((o.est_volume_score ?? 0) * weight * 10) / 10,
      })
    }
    sourceTotals[key] = data.opportunities.length
    console.log(
      `  · ${key.padEnd(15)} — loaded ${data.opportunities.length} rows, weight ${weight}`
    )
  }

  if (all.length === 0) {
    console.error('\n❌ No source files found. Run at least one of:')
    console.error('   npm run mine:gsc:apply  /  mine:suggest:apply  /  mine:reddit:apply  /  mine:quora:apply\n')
    process.exit(1)
  }

  // Dedup on (tool_slug, page_type, normalized_keyword) — keep the
  // highest combined_score row for each unique (slug, type, keyword)
  // triple, but sum scores across sources (cross-source consensus
  // boosts confidence).
  const dedup = new Map<string, MergedOpportunity>()
  for (const o of all) {
    const key = `${o.tool_slug}|${o.page_type}|${normalizeKeyword(o.target_keyword)}`
    const existing = dedup.get(key)
    if (!existing) {
      dedup.set(key, o)
    } else {
      dedup.set(key, {
        ...existing,
        combined_score: Math.round((existing.combined_score + o.combined_score) * 10) / 10,
        // If the existing row is from a lower-priority source, prefer
        // the higher-priority source's metadata for downstream display.
        ...(o.source === 'gsc' || (o.source === 'google-suggest' && existing.source !== 'gsc')
          ? { source: o.source, ...sourceMetadata(o, existing) }
          : {}),
      })
    }
  }

  const merged = Array.from(dedup.values()).sort((a, b) => b.combined_score - a.combined_score)

  // Bucket totals
  const bucketTotals: Record<PageType, number> = {
    compare: 0,
    alternative: 0,
    'worth-it': 0,
    'how-to': 0,
    'use-case': 0,
    pricing: 0,
    unbucketed: 0,
  }
  for (const o of merged) bucketTotals[o.page_type] += 1

  const output = {
    generated_at: new Date().toISOString(),
    sources_present: presentSources,
    source_row_counts: sourceTotals,
    total_unique_opportunities: merged.length,
    bucket_totals: bucketTotals,
    opportunities: merged,
  }
  const out = join(SCRIPTS, '.keyword-opportunities.json')
  writeFileSync(out, JSON.stringify(output, null, 2))

  console.log('')
  console.log(`✓ Wrote ${merged.length} unique opportunities to ${out}`)
  console.log(`  Bucket totals:`, bucketTotals)
  console.log('')
  console.log(`Top 10 by combined_score:`)
  for (const o of merged.slice(0, 10)) {
    console.log(
      `  · ${o.tool_slug.padEnd(20)} | ${o.page_type.padEnd(11)} | ${o.source.padEnd(15)} | score ${String(o.combined_score).padStart(5)} | "${o.target_keyword.slice(0, 70)}"`
    )
  }
}

// When merging two rows for the same (slug, type, keyword), this picks
// the source-specific metadata fields from whichever row we elect to
// represent the combined entry — the higher-priority source wins.
function sourceMetadata(a: MergedOpportunity, b: MergedOpportunity): Partial<MergedOpportunity> {
  // Strip combined_score + source (already set by caller) and merge the rest
  const { combined_score: _cs, source: _s, ...rest } = a
  return rest
}

import { withLock } from './_lib/lockfile' // BUG-21: serialize this stateful job
withLock('merge-opportunities', main).catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
