/**
 * Export the daily_update_summaries table → docs/operations/daily-updates-log.md.
 *
 * Lets the operator keep a portable markdown view of growth + freshness
 * activity without needing the admin UI. Append-only style — newest day
 * at top, older days below. Re-runnable; rewrites the whole file each
 * time from the live DB.
 *
 *   npm run daily:log:export
 */
export {}

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

type Row = {
  utc_date: string
  tools_refreshed: number
  tools_refresh_failed: number
  tools_ingested: number
  tools_ingest_gated: number
  tools_ingest_failed: number
  compares_regenerated: number
  tools_latest_updates_refreshed: number
  bing_urls_submitted: number
  refreshed_slugs_sample: string[]
  ingested_slugs_sample: string[]
  cascaded_slugs_sample: string[]
  total_published_tools: number | null
  oldest_last_verified_at: string | null
  cascade_backlog: number | null
  health_flags: Record<string, boolean | string>
}

function fmtSlugs(slugs: string[], basePath: string): string {
  if (slugs.length === 0) return '_(none)_'
  return slugs.map((s) => `[\`${s}\`](https://rightaichoice.com${basePath}/${s})`).join(', ')
}

function dayBlock(r: Row): string {
  const flags = Object.keys(r.health_flags ?? {})
  const flagLine = flags.length > 0 ? `  ⚠ **Health flags:** ${flags.join(', ')}\n` : ''
  return `## ${r.utc_date}

| Metric | Count |
|---|---|
| Tools refreshed | **${r.tools_refreshed}** (${r.tools_refresh_failed} failed) |
| Tools added (net-new, traction-gated) | **${r.tools_ingested}** (${r.tools_ingest_gated} gated, ${r.tools_ingest_failed} failed) |
| Compare editorials regenerated | **${r.compares_regenerated}** |
| Latest-updates refreshed | ${r.tools_latest_updates_refreshed} |
| URLs pushed to Bing | ${r.bing_urls_submitted} |
| Total published catalog | ${r.total_published_tools?.toLocaleString() ?? '—'} |
| Stalest tool | ${r.oldest_last_verified_at ? new Date(r.oldest_last_verified_at).toISOString().slice(0, 10) : '—'} |
| Compare backlog | ${r.cascade_backlog?.toLocaleString() ?? '—'} |
${flagLine}
**Refreshed (sample):** ${fmtSlugs(r.refreshed_slugs_sample, '/tools')}

**New tools (sample):** ${fmtSlugs(r.ingested_slugs_sample, '/tools')}

**Compares re-edited (sample):** ${fmtSlugs(r.cascaded_slugs_sample, '/compare')}

---
`
}

async function main() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('daily_update_summaries')
    .select('*')
    .order('utc_date', { ascending: false })
    .limit(180)

  if (error) {
    console.error(`Query failed: ${error.message}`)
    process.exit(1)
  }
  const rows = (data ?? []) as Row[]

  const header = `# Daily Updates — RightAIChoice

Append-only log of every refresh, ingest, and cascade across all
Phase 8 freshness pipelines. Written nightly from the
\`daily_update_summaries\` table.

> This file is regenerated from the DB each time \`npm run daily:log:export\`
> runs. The DB is the source of truth; this is a portable view.

**Pipelines covered:**
1. Hourly tool refresh (~240/day) — DeepSeek V3 synthesizes 9 SEO fields
2. Twice-daily new-tool ingest (50/day target, traction-gated by HN + Reddit)
3. Daily compare-editorial cascade (~20/day) when underlying tools change
4. Daily Bing direct API submission (~100/day, rotation cursor)
5. IndexNow daily ping (Bing + Yandex)
6. Latest-updates daily refresh (top 50 tools)

**Last regenerated:** ${new Date().toISOString()}

---

`

  const body = rows.map(dayBlock).join('\n')
  const out = header + body

  const dir = join(process.cwd(), 'docs', 'operations')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const path = join(dir, 'daily-updates-log.md')
  writeFileSync(path, out, 'utf-8')

  console.log(`✓ Wrote ${rows.length} daily summaries to ${path}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
