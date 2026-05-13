/**
 * Phase 7H follow-up (2026-05-13): build the top-100 GSC manual
 * indexing-request list.
 *
 * Reads scripts/.keyword-opportunities.json + scores each canonical
 * pair slug by sum(combined_score) across both tools' compare-bucket
 * opportunities. Verifies each pair is actually live in the DB (not
 * the 1 stubborn failure). Writes a markdown checklist the user can
 * tick off across the ~9 days of GSC manual submissions.
 *
 * USAGE:
 *   npm run gsc:build-list
 *
 * OUTPUT:
 *   docs/marketing/top-100-gsc-indexing-list.md
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

const OPPS_FILE = join(process.cwd(), 'scripts', '.keyword-opportunities.json')
const OUT_FILE = join(process.cwd(), 'docs', 'marketing', 'top-100-gsc-indexing-list.md')
const TOP_N = 100

type Opp = {
  tool_slug: string
  page_type: string
  target_keyword: string
  combined_score: number
}

function extractCompetitor(query: string): string | null {
  const match = query.match(/\b(?:vs\.?|versus|compared\s+to)\s+(.+?)(?:\s+|$)/i)
  if (!match) return null
  let name = match[1].trim()
  name = name.replace(/\s+(for|in|review|reviews|2024|2025|2026|free|paid|pricing|cost).*$/i, '')
  return name.length >= 2 && name.length <= 60 ? name : null
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}]/g, '')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\b(ai|app|tool|software|platform)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  if (!existsSync(OPPS_FILE)) {
    console.error(`\n❌ ${OPPS_FILE} not found. Run \`npm run mine:merge\` first.\n`)
    process.exit(1)
  }
  const data = JSON.parse(readFileSync(OPPS_FILE, 'utf-8'))
  const opps: Opp[] = data.opportunities ?? []
  console.log(`Loaded ${opps.length} opportunities`)

  // Score every (slug-a, slug-b) pair by sum of compare-bucket combined_score.
  // Pair_slug is alpha-sorted to match the canonical form Phase 7B used.
  const supa = getAdminClient()
  // PostgREST hard-caps responses at 1000 rows on this project — chunk
  // until exhausted so the full ~1,178-tool catalog comes through.
  const toolList: Array<{ slug: string; name: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data: chunk, error } = await supa
      .from('tools')
      .select('slug, name')
      .range(from, from + 999)
    if (error) throw error
    const rows = (chunk ?? []) as Array<{ slug: string; name: string }>
    toolList.push(...rows)
    if (rows.length < 1000) break
  }
  console.log(`Loaded ${toolList.length} tools for pair matching`)
  const slugByName = new Map<string, string>()
  for (const t of toolList) {
    slugByName.set(normalizeName(t.name), t.slug)
    slugByName.set(normalizeName(t.slug.replace(/-/g, ' ')), t.slug)
  }

  type PairAcc = { slug: string; score: number; sample_query: string; both_names: [string, string] }
  const pairs = new Map<string, PairAcc>()
  for (const opp of opps) {
    if (opp.page_type !== 'compare') continue
    const competitor = extractCompetitor(opp.target_keyword)
    if (!competitor) continue
    const compSlug = slugByName.get(normalizeName(competitor))
    if (!compSlug || compSlug === opp.tool_slug) continue
    const [a, b] = [opp.tool_slug, compSlug].sort()
    const pairSlug = `${a}-vs-${b}`
    const aName = toolList.find((t) => t.slug === a)?.name ?? a
    const bName = toolList.find((t) => t.slug === b)?.name ?? b
    const existing = pairs.get(pairSlug)
    if (existing) {
      existing.score += opp.combined_score
    } else {
      pairs.set(pairSlug, {
        slug: pairSlug,
        score: opp.combined_score,
        sample_query: opp.target_keyword,
        both_names: [aName, bName],
      })
    }
  }
  console.log(`Derived ${pairs.size} unique candidate pairs from compare-bucket queries`)

  // Verify each pair is live in tool_comparisons (skip the 1 stubborn failure)
  const allSlugs = Array.from(pairs.keys())
  const liveSlugs = new Set<string>()
  const PAGE = 500
  for (let i = 0; i < allSlugs.length; i += PAGE) {
    const chunk = allSlugs.slice(i, i + PAGE)
    const { data: rows, error } = await supa
      .from('tool_comparisons')
      .select('slug')
      .eq('is_editorial', true)
      .in('slug', chunk)
    if (error) {
      console.error(`DB lookup error on chunk ${i}-${i + PAGE}: ${error.message}`)
      continue
    }
    for (const r of (rows ?? []) as Array<{ slug: string }>) liveSlugs.add(r.slug)
  }
  console.log(`Verified ${liveSlugs.size} pairs live in tool_comparisons (others are pending generation or below match threshold)`)

  const top = Array.from(pairs.values())
    .filter((p) => liveSlugs.has(p.slug))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)

  const today = new Date().toISOString().slice(0, 10)
  const md = `# Top ${TOP_N} GSC Manual Indexing Submissions

**Generated:** ${today}
**Goal:** Submit each of these URLs to Google Search Console → URL Inspection → "Request Indexing".
**Quota:** Google allows ~12 manual requests per day per property. ~${Math.ceil(TOP_N / 12)} days to do all ${TOP_N}.

---

## How to use this list

1. Open https://search.google.com/search-console
2. Select the \`rightaichoice.com\` property
3. Top URL bar → paste a URL from below → Enter
4. Wait for "URL is on Google" / "URL is not on Google" verdict
5. Click **"Request Indexing"** button
6. Wait ~30 sec for the request to be queued
7. ✓ Tick the checkbox below
8. Repeat for next URL (max 12 per day, then come back tomorrow)

**Tip:** Do them in batches of 12. Pace ~10 minutes per batch.

---

## URLs (sorted by SEO opportunity score, highest first)

${top
  .map(
    (p, i) =>
      `${i + 1}. - [ ] [${p.both_names[0]} vs ${p.both_names[1]}](https://rightaichoice.com/compare/${p.slug}) — score ${Math.round(p.score)}, signal: \`${p.sample_query.slice(0, 80)}\``
  )
  .join('\n')}

---

## Plain URL list (copy-paste friendly)

\`\`\`
${top.map((p) => `https://rightaichoice.com/compare/${p.slug}`).join('\n')}
\`\`\`

---

## Status check

After submitting, verify pages get indexed by searching: \`site:rightaichoice.com/compare/{slug}\` in Google. Pages typically appear in 2-7 days post-request, sometimes faster.

If a URL says "URL is not on Google" but Google rejects the indexing request with "Indexing request rejected" — that's a content-quality flag (programmatic-SEO suspicion). The deep-v3 pages should pass; thin v2 pages may not. Move on to the next URL — don't keep retrying.
`

  writeFileSync(OUT_FILE, md)
  console.log(`\n✓ Wrote ${top.length} URLs to ${OUT_FILE}`)
  console.log(`  At 12/day quota, you can submit all ${top.length} in ${Math.ceil(top.length / 12)} days.`)
  if (top.length < TOP_N) {
    console.log(`  (Only ${top.length} of ${TOP_N} pairs from the keyword data were live in the DB; the rest were either not generated or below the matching threshold.)`)
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
