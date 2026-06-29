/**
 * Phase 10.0 (2026-06-11) — Admin-metric baseline snapshot.
 *
 * Runs every range-driven admin query function over a PINNED historical
 * window and writes the results to docs/admin/baselines/<label>.json.
 * This is the regression oracle for the Phase 10 redesign: after any
 * refactor we re-run the snapshot and diff — numbers must not change
 * unless the diff is an intended, documented bug fix.
 *
 * Each function is executed TWICE; functions whose two runs differ are
 * marked nondeterministic (audit signal — usually an RPC using now()
 * internally or missing ORDER BY).
 *
 * Functions that are inherently now-anchored (getEngagementMetrics,
 * getKpiRows, getVolumeProjection, getEventHealth) are captured under
 * `volatile` and excluded from strict diffing.
 *
 * USAGE:
 *   npm run audit:snapshot                 # writes baselines/<from>_<to>.json
 *   npm run audit:snapshot -- --label=post-phase2
 *
 * Scope note: only the exported query modules (insights, plan-conversion)
 * are snapshot-able; pages that compute metrics inline (updates, health,
 * sentiment, …) are covered by Phase 1 SQL cross-checks instead, and get
 * extracted into query modules during their Phase 5 rebuild.
 */
export {}

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RangeSelection } from '@/lib/admin/range'
import { baseFilters } from '@/lib/admin/filters'
import * as insights from '@/app/admin/insights/queries'
import * as planConv from '@/lib/admin/plan-conversion'
import * as sentiment from '@/lib/admin/sentiment'

// ── Pinned window: 2026-06-01 .. 2026-06-07 IST (end-exclusive) ────────────
// Past data is immutable, so every run over this window must be identical.
const FROM = '2026-06-01'
const TO = '2026-06-07'

const SEL: RangeSelection = {
  key: 'custom',
  cutoffISO: new Date(`${FROM}T00:00:00+05:30`).toISOString(),
  endCutoffISO: new Date('2026-06-08T00:00:00+05:30').toISOString(),
  label: `${FROM} → ${TO}`,
  calendarAnchored: true,
  days: 7,
}

const labelArg = process.argv.find((a) => a.startsWith('--label='))
const LABEL = labelArg ? labelArg.split('=')[1] : `${FROM}_${TO}`

type Snap = {
  value?: unknown
  error?: string
  deterministic?: boolean
}

/** Run fn twice; record value, error, and whether both runs matched. */
async function snap(fn: () => Promise<unknown>): Promise<Snap> {
  try {
    const a = await fn()
    const b = await fn()
    const ja = JSON.stringify(a)
    const jb = JSON.stringify(b)
    return { value: a, deterministic: ja === jb }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env not set (run with --env-file=.env.local)')
  }

  console.log(`Pinned window: ${SEL.cutoffISO} .. ${SEL.endCutoffISO}`)
  console.log(`Label: ${LABEL}\n`)

  // (name, includeBots-variant aware runner) for every pinned-window query.
  const pinned: Record<string, Snap> = {}
  const both = async (name: string, fn: (bots: boolean) => Promise<unknown>) => {
    pinned[`${name}.humans`] = await snap(() => fn(false))
    pinned[`${name}.withBots`] = await snap(() => fn(true))
    process.stdout.write('.')
  }
  const one = async (name: string, fn: () => Promise<unknown>) => {
    pinned[name] = await snap(fn)
    process.stdout.write('.')
  }

  // Phase 10.4.7 — the main-page query functions now take AdminFilters;
  // baseFilters(SEL, b) carries range+bots only (filtersToJsonb → null →
  // the RPC null fast-path), so pinned values stay comparable across the
  // signature change.
  await one('insights.getBotShare', () => insights.getBotShare(baseFilters(SEL, false)))
  await both('insights.getOverviewMetrics', (b) => insights.getOverviewMetrics(baseFilters(SEL, b)))
  await both('insights.getDailyActiveUsers', (b) => insights.getDailyActiveUsers(baseFilters(SEL, b)))
  await both('insights.getPageViewsByDevice', (b) => insights.getPageViewsByDevice(baseFilters(SEL, b)))
  await both('insights.getTopReferrers', (b) => insights.getTopReferrers(baseFilters(SEL, b)))
  await both('insights.getPlanFunnel', (b) => insights.getPlanFunnel(baseFilters(SEL, b)))
  // Phase 10.5b — these four converted to AdminFilters; baseFilters keeps
  // keys + values byte-identical via the RPC null fast-path.
  await both('insights.getTopExistingTools', (b) => insights.getTopExistingTools(baseFilters(SEL, b)))
  await both('insights.getTopUseCases', (b) => insights.getTopUseCases(baseFilters(SEL, b)))
  await both('insights.getTopEvents', (b) => insights.getTopEvents(baseFilters(SEL, b)))
  await both('insights.getSearchMetrics', (b) => insights.getSearchMetrics(baseFilters(SEL, b)))
  await both('insights.getTopSearches', (b) => insights.getTopSearches(baseFilters(SEL, b)))
  await both('insights.getChatMetrics', (b) => insights.getChatMetrics(baseFilters(SEL, b)))
  await both('insights.getTopChatTools', (b) => insights.getTopChatTools(baseFilters(SEL, b)))
  await both('insights.getTopViewedTools', (b) => insights.getTopViewedTools(baseFilters(SEL, b)))
  await both('insights.getTopClickedTools', (b) => insights.getTopClickedTools(baseFilters(SEL, b)))
  await both('insights.getTopSavedTools', (b) => insights.getTopSavedTools(baseFilters(SEL, b)))
  await both('insights.getTopComparedTools', (b) => insights.getTopComparedTools(baseFilters(SEL, b)))
  await both('insights.getReturningSummary', (b) => insights.getReturningSummary(baseFilters(SEL, b)))
  await one('insights.getReconciliationStats', () => insights.getReconciliationStats(baseFilters(SEL, false)))
  // Phase 10.5b — plan-conversion fns converted to AdminFilters; baseFilters
  // keeps the keys' shape and (via the null fast-path + humans-only default)
  // their pinned values byte-identical.
  await one('planConversion.getPlanFunnel', () => planConv.getPlanFunnel(baseFilters(SEL, false)))
  await one('planConversion.getSurfaceBreakdown', () => planConv.getSurfaceBreakdown(baseFilters(SEL, false)))
  await one('planConversion.getLinkRate', () => planConv.getLinkRate(baseFilters(SEL, false)))

  // ── Phase 10.5b additions (NEW keys — noted in phase5b-gate.md) ──────────
  await one('planConversion.getIntentStream', () => planConv.getIntentStream(baseFilters(SEL, false), 50))
  await both('sentiment.getSentimentFunnel', (b) => sentiment.getSentimentFunnel(baseFilters(SEL, b)))
  await one('sentiment.getSentimentRevenue', () => sentiment.getSentimentRevenue(baseFilters(SEL, false)))
  await one('sentiment.getSentimentScans', () => sentiment.getSentimentScans(baseFilters(SEL, false)))
  await both('insights.getEventVolumeList', (b) => insights.getEventVolumeList(baseFilters(SEL, b)))
  await one('insights.getEventPropertyBreakdown(page_viewed,path)', () =>
    insights.getEventPropertyBreakdown('page_viewed', 'path', baseFilters(SEL, false)))
  await both('insights.getToolHeatmap', (b) => insights.getToolHeatmap(baseFilters(SEL, b)))
  await both('insights.getToolAudienceDetail(screenplayiq)', (b) =>
    insights.getToolAudienceDetail('screenplayiq', baseFilters(SEL, b)))

  // ── Phase 10.7a addition (NEW key — noted in phase7a-gate.md) ────────────
  // Pinned week predates the channel epoch (2026-06-12), so this key snapshots
  // as the single '(unknown — pre-channel epoch)' bucket — by design.
  await both('insights.getTopChannels', (b) => insights.getTopChannels(baseFilters(SEL, b)))

  // Now-anchored functions — recorded for reference, excluded from strict diff.
  const volatile: Record<string, Snap> = {}
  const vol = async (name: string, fn: () => Promise<unknown>) => {
    volatile[name] = await snap(fn)
    process.stdout.write('.')
  }
  await vol('insights.getEngagementMetrics.humans', () => insights.getEngagementMetrics(baseFilters(SEL, false)))
  await vol('insights.getKpiRows', () => insights.getKpiRows())
  await vol('insights.getVolumeProjection', () => insights.getVolumeProjection())
  await vol('insights.getEventHealth.30', () => insights.getEventHealth(30))

  console.log('\n')

  const errors = Object.entries(pinned).filter(([, s]) => s.error)
  const nondet = Object.entries(pinned).filter(([, s]) => s.deterministic === false)
  for (const [k, s] of errors) console.log(`ERROR          ${k}: ${s.error}`)
  for (const [k] of nondet) console.log(`NONDETERMINISTIC ${k} (two runs differed)`)

  const out = {
    meta: {
      label: LABEL,
      window: { from: SEL.cutoffISO, to: SEL.endCutoffISO },
      generated_at: new Date().toISOString(),
      pinned_count: Object.keys(pinned).length,
      error_count: errors.length,
      nondeterministic_count: nondet.length,
    },
    pinned,
    volatile,
  }

  const dir = join(process.cwd(), 'docs', 'admin', 'baselines')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${LABEL}.json`)
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
  console.log(`✓ wrote ${file}`)
  console.log(`  pinned=${Object.keys(pinned).length} errors=${errors.length} nondeterministic=${nondet.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
