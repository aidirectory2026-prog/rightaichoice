import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

// Phase 9 Day-4 Part 2 (2026-05-29) — Weekly triage cron.
//
// Runs every Monday at 07:00 UTC, ~30 min after snapshot-gsc finishes its
// 06:30 Mon writes to gsc_snapshots + gsc_diffs. Reads the latest diff for
// each scope, applies a rules-based decision matrix to every page+query
// signal, dedups by page, picks the top-50 by priority, and writes them to
// weekly_loop_actions as status='proposed'.
//
// Why rules-based, not LLM: the decision matrix is deterministic — position
// band × impressions × CTR maps unambiguously to action_type. Calling an LLM
// here would add cost, latency, and non-determinism for zero quality lift.
// Save the LLM calls for the EXECUTION phase (title rewrites, content gen).
//
// Why this is its own cron (not folded into snapshot-gsc): separation lets
// us re-run triage without re-pulling GSC, and lets a future "manual triage"
// admin button hit the same handler with an override flag.
//
// Idempotency: deletes any existing 'proposed' rows for this snapshot_date
// before inserting. So a Monday re-run produces the same final state.
// Already-'accepted' or 'executed' rows are never touched.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── Decision matrix knobs ────────────────────────────────────────────
// Tuned to surface 30-50 actions/week from a ~5-10k row diff. If the
// queue is consistently empty or overflows, adjust here.

const POS_TOP3_CTR_FLOOR = 0.03           // pos 1-3 with CTR < 3% → underperformer
const POS_4_10_CTR_FLOOR = 0.01           // pos 4-10 with CTR < 1% → title rewrite
const POS_11_20_IMPR_FLOOR = 50           // pos 11-20 needs ≥50 impr to be worth a rewrite
const POS_21_30_IMPR_FLOOR = 30           // pos 21-30 needs ≥30 impr to be worth depth expansion
const NEW_IMPR_FLOOR = 30                 // 'new' signals need ≥30 impr to be worth boosting
const LOST_IMPR_FLOOR = 100               // 'lost' was material if prior impr ≥100
const LOSING_POS_DROP = 10                // 'losing' is critical if rank dropped ≥10
const WINNING_REGRESSION_POS_DELTA = -3   // 'winning' but dp ≤ -3 → still climbing; cement it
const CAP_PER_WEEK = 50

type Scope = '7d' | '28d'
type Signal = 'winning' | 'losing' | 'flat' | 'new' | 'lost'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type ActionType =
  | 'title_rewrite'
  | 'depth_expand'
  | 'links_inject'
  | 'noindex'
  | 'canonical_fix'
  | 'boost_discovery'
  | 'refresh_page'

type PqStat = {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type DiffRow = {
  page: string
  query: string
  signal: Signal
  current: PqStat | null
  prior: PqStat | null
  delta_position: number | null
  delta_impressions: number | null
  delta_clicks: number | null
  delta_ctr: number | null
}

type ActionCandidate = {
  page: string
  scope: Scope
  action_type: ActionType
  priority: Priority
  reason: string
  baseline_position: number | null
  baseline_impressions: number | null
  baseline_clicks: number | null
  baseline_ctr: number | null
  dominant_query: string
  delta_position: number | null
  delta_impressions: number | null
  signal: Signal
}

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

// ── Classification ──────────────────────────────────────────────────
//
// Each diff row produces at most ONE candidate. Page-level dedup happens
// later — multiple queries on the same page collapse to a single action
// using the highest-priority candidate, with the dominant query as rationale.

function classify(row: DiffRow, scope: Scope): ActionCandidate | null {
  const cur = row.current
  const pri = row.prior
  const dp = row.delta_position

  // ── Critical: lost a query that previously mattered ──
  if (row.signal === 'lost' && pri && pri.impressions >= LOST_IMPR_FLOOR) {
    return buildCandidate(row, scope, {
      action_type: 'refresh_page',
      priority: 'critical',
      reason: `Lost ranking for "${row.query}" (was ${pri.impressions} impr/wk, pos ${pri.position.toFixed(1)})`,
    })
  }
  // ── Critical: losing + huge rank drop + still in top-20 (rescuable) ──
  if (
    row.signal === 'losing' &&
    cur &&
    dp !== null &&
    dp >= LOSING_POS_DROP &&
    cur.position <= 20
  ) {
    return buildCandidate(row, scope, {
      action_type: 'refresh_page',
      priority: 'critical',
      reason: `Rank dropped ${dp.toFixed(0)} for "${row.query}" — now pos ${cur.position.toFixed(1)}, rescue window open`,
    })
  }
  // ── High: pos 11-20 with material impressions → title rewrite ──
  if (cur && cur.position >= 11 && cur.position <= 20 && cur.impressions >= POS_11_20_IMPR_FLOOR) {
    return buildCandidate(row, scope, {
      action_type: 'title_rewrite',
      priority: 'high',
      reason: `Pos ${cur.position.toFixed(1)} for "${row.query}" (${cur.impressions} impr) — title rewrite to crack page 1`,
    })
  }
  // ── High: pos 4-10 but CTR < 1% → earn-the-click rewrite ──
  if (cur && cur.position >= 4 && cur.position <= 10 && cur.ctr < POS_4_10_CTR_FLOOR && cur.impressions >= 30) {
    return buildCandidate(row, scope, {
      action_type: 'title_rewrite',
      priority: 'high',
      reason: `Pos ${cur.position.toFixed(1)} for "${row.query}" but CTR ${(cur.ctr * 100).toFixed(2)}% — title isn't earning the click`,
    })
  }
  // ── High: brand-new query with traction → boost discovery (sitemap, links) ──
  if (
    row.signal === 'new' &&
    cur &&
    cur.position >= 11 &&
    cur.position <= 30 &&
    cur.impressions >= NEW_IMPR_FLOOR
  ) {
    return buildCandidate(row, scope, {
      action_type: 'boost_discovery',
      priority: 'high',
      reason: `New query "${row.query}" landed at pos ${cur.position.toFixed(1)} (${cur.impressions} impr) — accelerate with internal links`,
    })
  }
  // ── High: winning but still climbing → cement with internal links ──
  if (
    row.signal === 'winning' &&
    cur &&
    dp !== null &&
    dp <= WINNING_REGRESSION_POS_DELTA &&
    cur.position <= 30
  ) {
    return buildCandidate(row, scope, {
      action_type: 'links_inject',
      priority: 'high',
      reason: `Climbing on "${row.query}" (${dp.toFixed(0)} pos, now ${cur.position.toFixed(1)}) — internal links cement the gain`,
    })
  }
  // ── Medium: pos 21-30 with impressions → depth expansion ──
  if (cur && cur.position >= 21 && cur.position <= 30 && cur.impressions >= POS_21_30_IMPR_FLOOR) {
    return buildCandidate(row, scope, {
      action_type: 'depth_expand',
      priority: 'medium',
      reason: `Pos ${cur.position.toFixed(1)} for "${row.query}" (${cur.impressions} impr) — depth expansion to climb out of page 3`,
    })
  }
  // ── Medium: top-3 but weak CTR → title needs a sharper hook ──
  if (cur && cur.position >= 1 && cur.position <= 3 && cur.ctr < POS_TOP3_CTR_FLOOR && cur.impressions >= 50) {
    return buildCandidate(row, scope, {
      action_type: 'title_rewrite',
      priority: 'medium',
      reason: `Top-3 for "${row.query}" but CTR ${(cur.ctr * 100).toFixed(2)}% — title isn't optimized for the SERP`,
    })
  }

  return null

  function buildCandidate(
    r: DiffRow,
    sc: Scope,
    parts: { action_type: ActionType; priority: Priority; reason: string },
  ): ActionCandidate {
    const baseline = r.current ?? r.prior
    return {
      page: r.page,
      scope: sc,
      action_type: parts.action_type,
      priority: parts.priority,
      reason: parts.reason,
      baseline_position: baseline?.position ?? null,
      baseline_impressions: baseline?.impressions ?? null,
      baseline_clicks: baseline?.clicks ?? null,
      baseline_ctr: baseline?.ctr ?? null,
      dominant_query: r.query,
      delta_position: r.delta_position,
      delta_impressions: r.delta_impressions,
      signal: r.signal,
    }
  }
}

// ── Dedup: one action per page, picking the highest-priority candidate ──

function dedupByPage(candidates: ActionCandidate[]): ActionCandidate[] {
  const byPage = new Map<string, ActionCandidate>()
  for (const c of candidates) {
    const existing = byPage.get(c.page)
    if (!existing) {
      byPage.set(c.page, c)
      continue
    }
    // Higher priority wins; tie → higher impressions wins.
    const cRank = PRIORITY_RANK[c.priority]
    const eRank = PRIORITY_RANK[existing.priority]
    if (cRank > eRank) {
      byPage.set(c.page, c)
    } else if (cRank === eRank) {
      const cImpr = c.baseline_impressions ?? 0
      const eImpr = existing.baseline_impressions ?? 0
      if (cImpr > eImpr) byPage.set(c.page, c)
    }
  }
  return Array.from(byPage.values())
}

function rank(candidates: ActionCandidate[]): ActionCandidate[] {
  return [...candidates].sort((a, b) => {
    const dr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
    if (dr !== 0) return dr
    return (b.baseline_impressions ?? 0) - (a.baseline_impressions ?? 0)
  })
}

// ── DB helpers ──────────────────────────────────────────────────────

async function loadLatestDiff(scope: Scope): Promise<{ id: string; to_date: string; signals: DiffRow[] } | null> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('gsc_diffs')
    .select('id, to_date, signals')
    .eq('scope', scope)
    .order('to_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`fetch latest diff (${scope}): ${error.message}`)
  if (!data) return null
  const row = data as { id: string; to_date: string; signals: DiffRow[] }
  return { id: row.id, to_date: row.to_date, signals: row.signals ?? [] }
}

// ── Handler ─────────────────────────────────────────────────────────

export const GET = cronRoute({ pipelineKey: 'triage-gsc' }, async (ctx) => {
  const scopes: Scope[] = ['7d', '28d']
  const allCandidates: ActionCandidate[] = []
  const diffMeta: Record<string, unknown> = {}
  let snapshotDate: string | null = null
  let primaryDiffId: string | null = null

  for (const scope of scopes) {
    const diff = await loadLatestDiff(scope)
    if (!diff) {
      diffMeta[scope] = { skipped: 'no_diff_yet' }
      continue
    }
    diffMeta[scope] = { diff_id: diff.id, to_date: diff.to_date, signals_count: diff.signals.length }
    // Use the most recent date across scopes as snapshot_date; diff_id from
    // 7d takes precedence (it's the faster signal we're acting on first).
    if (!snapshotDate || diff.to_date > snapshotDate) snapshotDate = diff.to_date
    if (scope === '7d') primaryDiffId = diff.id
    else if (!primaryDiffId) primaryDiffId = diff.id

    for (const row of diff.signals) {
      const cand = classify(row, scope)
      if (cand) allCandidates.push(cand)
    }
  }

  if (!snapshotDate) {
    ctx.recordMetadata({ skipped: 'no_diffs_yet', ...diffMeta })
    return { ok: true, skipped: 'no_diffs_yet' }
  }

  const deduped = dedupByPage(allCandidates)
  const ranked = rank(deduped).slice(0, CAP_PER_WEEK)

  // Idempotency: clear this week's 'proposed' rows so a re-run lands
  // on the same final state. Never touch accepted/executed/measured.
  const db = getAdminClient()
  const { error: delErr } = await db
    .from('weekly_loop_actions')
    .delete()
    .eq('snapshot_date', snapshotDate)
    .eq('status', 'proposed')
  if (delErr) throw new Error(`clear proposed for ${snapshotDate}: ${delErr.message}`)

  if (ranked.length === 0) {
    ctx.recordItems({ processed: allCandidates.length, succeeded: 0 })
    ctx.recordMetadata({
      snapshot_date: snapshotDate,
      candidates_total: allCandidates.length,
      candidates_deduped: deduped.length,
      written: 0,
      ...diffMeta,
    })
    return { ok: true, snapshot_date: snapshotDate, written: 0 }
  }

  const rows = ranked.map((c) => ({
    diff_id: primaryDiffId,
    snapshot_date: snapshotDate,
    page: c.page,
    action_type: c.action_type,
    priority: c.priority,
    reason: c.reason,
    status: 'proposed' as const,
    metadata: {
      scope: c.scope,
      signal: c.signal,
      dominant_query: c.dominant_query,
      delta_position: c.delta_position,
      delta_impressions: c.delta_impressions,
      baseline_position: c.baseline_position,
      baseline_impressions: c.baseline_impressions,
      baseline_clicks: c.baseline_clicks,
      baseline_ctr: c.baseline_ctr,
    },
  }))

  const { error: insErr } = await db.from('weekly_loop_actions').insert(rows as never)
  if (insErr) throw new Error(`insert weekly_loop_actions: ${insErr.message}`)

  // Bucket counts for the metadata view in Knowledge Room.
  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const byAction: Record<string, number> = {}
  for (const c of ranked) {
    byPriority[c.priority]++
    byAction[c.action_type] = (byAction[c.action_type] ?? 0) + 1
  }

  ctx.recordItems({ processed: allCandidates.length, succeeded: ranked.length })
  ctx.recordMetadata({
    snapshot_date: snapshotDate,
    candidates_total: allCandidates.length,
    candidates_deduped: deduped.length,
    written: ranked.length,
    by_priority: byPriority,
    by_action: byAction,
    ...diffMeta,
  })

  return {
    ok: true,
    snapshot_date: snapshotDate,
    written: ranked.length,
    by_priority: byPriority,
    by_action: byAction,
  }
})
