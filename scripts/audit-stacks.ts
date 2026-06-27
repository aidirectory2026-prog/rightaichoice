/**
 * Phase 12 Bug-4.9 (2026-06-27) — stack viability audit.
 *
 * The "Best AI Stack for {Goal}" pages (lib/data/stacks.ts) reference tools by
 * slug. Over time a referenced tool can be unpublished, merged into another, or
 * decay to an at-risk viability score — leaving a stack that recommends dead or
 * shaky picks. This resolves every slug each stack references against the live
 * DB and reports per-stack health so we can prune / fix.
 *
 * A stack is flagged DELETE when: its bestPick (the headline pick) for any stage
 * is missing/unpublished/merged, OR >30% of all referenced tools are unhealthy
 * (missing, unpublished, merged, or viability_score < 40).
 *
 * Run: npx tsx --env-file=.env.local scripts/audit-stacks.ts
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { STACKS } from '../lib/data/stacks'

const AT_RISK = 40

type Health = {
  slug: string
  published: boolean
  merged: boolean
  viability: number | null
}

async function main() {
  const sb = getAdminClient()

  // Collect every slug referenced anywhere in any stack.
  const allSlugs = new Set<string>()
  for (const s of STACKS) {
    for (const stage of s.stages) {
      allSlugs.add(stage.bestPick.slug)
      for (const a of stage.alternatives) allSlugs.add(a.slug)
    }
  }

  const { data, error } = await sb
    .from('tools')
    .select('slug, is_published, viability_score, merged_into')
    .in('slug', [...allSlugs])
  if (error) throw error

  const health = new Map<string, Health>()
  for (const r of (data as Array<{ slug: string; is_published: boolean; viability_score: number | null; merged_into: string | null }>) ?? []) {
    health.set(r.slug, {
      slug: r.slug,
      published: !!r.is_published,
      merged: !!r.merged_into,
      viability: r.viability_score,
    })
  }

  const unhealthy = (slug: string): string | null => {
    const h = health.get(slug)
    if (!h) return 'missing'
    if (h.merged) return 'merged'
    if (!h.published) return 'unpublished'
    if (h.viability != null && h.viability < AT_RISK) return `at-risk(${h.viability})`
    return null
  }

  console.log(`[audit-stacks] ${STACKS.length} stacks, ${allSlugs.size} unique tool refs\n`)
  const flagged: string[] = []

  for (const s of STACKS) {
    const refs = new Set<string>()
    const bestPickIssues: string[] = []
    for (const stage of s.stages) {
      refs.add(stage.bestPick.slug)
      const bp = unhealthy(stage.bestPick.slug)
      if (bp) bestPickIssues.push(`${stage.name}: bestPick ${stage.bestPick.slug} → ${bp}`)
      for (const a of stage.alternatives) refs.add(a.slug)
    }
    const issues = [...refs].map((r) => ({ r, why: unhealthy(r) })).filter((x) => x.why)
    const pct = refs.size ? Math.round((issues.length / refs.size) * 100) : 0
    const flag = bestPickIssues.length > 0 || pct > 30
    if (flag) flagged.push(s.slug)

    const tag = flag ? 'DELETE?' : 'ok'
    console.log(`[${tag}] ${s.slug} — ${issues.length}/${refs.size} unhealthy (${pct}%)`)
    if (bestPickIssues.length) for (const b of bestPickIssues) console.log(`        ⚠ ${b}`)
    if (issues.length) console.log(`        bad refs: ${issues.map((x) => `${x.r}(${x.why})`).join(', ')}`)
  }

  console.log(`\n[audit-stacks] flagged for delete/fix: ${flagged.length}`)
  if (flagged.length) console.log(`  ${flagged.join('\n  ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
