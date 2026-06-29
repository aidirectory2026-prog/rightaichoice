import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { MetricCard } from '@/components/admin/charts'
import { acceptAction, rejectAction, markExecuted, applyTitleAction } from './actions'

// Phase 9 Day-4 Part 2 (2026-05-29) — Weekly SEO triage review page.
// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, kit MetricCards, ⓘ provenance popovers).
// Data + query semantics unchanged: the WoW card keeps its custom GSC
// snapshot pairing (latest two weekly snapshots per scope) — this page is
// snapshot-paired, NOT date-ranged, so the global filter bar does not apply.
//
// Reads weekly_loop_actions (status IN proposed/accepted) plus the latest
// gsc_diffs and gsc_snapshots for the WoW summary card at the top.
// Each row exposes Accept / Reject / Mark Executed server actions.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'SEO Pulse — Admin' }

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Status = 'proposed' | 'accepted' | 'rejected' | 'executed' | 'measured' | 'reverted'

type ActionRow = {
  id: string
  page: string
  action_type: string
  priority: Priority
  reason: string
  status: Status
  snapshot_date: string
  proposed_at: string
  accepted_at: string | null
  executed_at: string | null
  baseline_position: number | null
  baseline_impressions: number | null
  baseline_clicks: number | null
  baseline_ctr: number | null
  metadata: {
    scope?: string
    signal?: string
    dominant_query?: string
    delta_position?: number | null
    delta_impressions?: number | null
    baseline_position?: number | null
    baseline_impressions?: number | null
    baseline_clicks?: number | null
    baseline_ctr?: number | null
  } | null
}

type SnapshotTotals = {
  scope: '7d' | '28d'
  snapshot_date: string
  totals: { clicks?: number; impressions?: number; ctr?: number; position?: number }
}

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: 'bg-rose-950 text-rose-300 border-rose-800',
  high: 'bg-amber-950 text-amber-300 border-amber-800',
  medium: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  low: 'bg-zinc-900 text-zinc-400 border-zinc-700',
}

const STATUS_STYLES: Record<Status, string> = {
  proposed: 'bg-zinc-800 text-zinc-300',
  accepted: 'bg-emerald-950 text-emerald-300',
  rejected: 'bg-zinc-900 text-zinc-500 line-through',
  executed: 'bg-blue-950 text-blue-300',
  measured: 'bg-purple-950 text-purple-300',
  reverted: 'bg-zinc-900 text-zinc-500',
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${(n * 100).toFixed(2)}%`
}

function fmtPos(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(1)
}

function deltaColor(delta: number | null | undefined, kind: 'count' | 'pos' | 'pct'): string {
  if (!delta) return 'text-zinc-500'
  const isGood = kind === 'pos' ? delta < 0 : delta > 0
  return isGood ? 'text-emerald-400' : 'text-rose-400'
}

function fmtDelta(curr: number | undefined, prior: number | undefined, kind: 'count' | 'pos' | 'pct'): { text: string; color: string } {
  if (curr === undefined || prior === undefined) return { text: '—', color: 'text-zinc-500' }
  const d = curr - prior
  if (d === 0) return { text: '·', color: 'text-zinc-500' }
  const sign = d > 0 ? '+' : ''
  const formatted =
    kind === 'pct' ? `${sign}${(d * 100).toFixed(2)}pp` :
    kind === 'pos' ? `${sign}${d.toFixed(1)}` :
    `${sign}${d.toLocaleString()}`
  return { text: formatted, color: deltaColor(d, kind) }
}

async function loadSnapshotPair(supabase: Awaited<ReturnType<typeof createClient>>, scope: '7d' | '28d') {
  const { data } = await supabase
    .from('gsc_snapshots')
    .select('snapshot_date, totals')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(2)
  const list = (data ?? []) as unknown as Array<Omit<SnapshotTotals, 'scope'>>
  return {
    current: list[0] ? { scope, ...list[0] } : null,
    prior: list[1] ? { scope, ...list[1] } : null,
  }
}

export default async function SeoPulsePage() {
  const supabase = await createClient()

  const [{ data: rawActions, error: actionErr }, p7, p28] = await Promise.all([
    supabase
      .from('weekly_loop_actions')
      .select('id, page, action_type, priority, reason, status, snapshot_date, proposed_at, accepted_at, executed_at, baseline_position, baseline_impressions, baseline_clicks, baseline_ctr, metadata')
      .in('status', ['proposed', 'accepted', 'executed'])
      .order('snapshot_date', { ascending: false }),
    loadSnapshotPair(supabase, '7d'),
    loadSnapshotPair(supabase, '28d'),
  ])

  if (actionErr) {
    return (
      <div className="text-zinc-300">
        <h1 className="text-2xl font-bold text-white mb-2">SEO Pulse</h1>
        <p className="text-sm text-rose-400">
          weekly_loop_actions table not found — apply migration 093_gsc_snapshots.sql via Supabase.
        </p>
      </div>
    )
  }

  const actions = (rawActions ?? []) as ActionRow[]
  const proposed = actions.filter((a) => a.status === 'proposed')
  const accepted = actions.filter((a) => a.status === 'accepted')
  const executed = actions.filter((a) => a.status === 'executed')

  const sortedProposed = [...proposed].sort((a, b) => {
    const dr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
    if (dr !== 0) return dr
    return (b.baseline_impressions ?? b.metadata?.baseline_impressions ?? 0) -
           (a.baseline_impressions ?? a.metadata?.baseline_impressions ?? 0)
  })

  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const a of proposed) byPriority[a.priority]++

  const latestSnapshotDate =
    proposed[0]?.snapshot_date ??
    p7.current?.snapshot_date ??
    p28.current?.snapshot_date ??
    null

  return (
    <div className="text-zinc-300">
      <PageHeader>
        <div className="text-xs text-zinc-500">
          Crons: triage-gsc (Mon 07:00 UTC) · email-weekly-digest (Mon 08:00 UTC)
        </div>
      </PageHeader>

      <p className="mb-6 -mt-2 max-w-3xl text-xs text-zinc-500">
        Weekly triage queue · {latestSnapshotDate ? `snapshot ${latestSnapshotDate}` : 'no snapshot yet'}.
        Snapshot-paired, not date-ranged: the WoW card compares the latest two weekly GSC snapshots
        per scope (custom control kept — the global range filter does not apply here).
      </p>

      {/* WoW summary card — custom GSC snapshot pairing, kept as-is */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <h2 className="mb-3 flex items-center gap-1 text-xs uppercase tracking-wider text-zinc-500">
          Site-wide totals
          <MetricInfo docKey="seo_pulse_wow" align="left" />
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 pr-4">Scope</th>
              <th className="text-left py-2 pr-4">Clicks</th>
              <th className="text-left py-2 pr-4">Impressions</th>
              <th className="text-left py-2 pr-4">CTR</th>
              <th className="text-left py-2 pr-4">Avg pos</th>
            </tr>
          </thead>
          <tbody>
            {(['7d', '28d'] as const).map((scope) => {
              const pair = scope === '7d' ? p7 : p28
              const c = pair.current?.totals
              const p = pair.prior?.totals
              if (!c) return (
                <tr key={scope} className="border-t border-zinc-800">
                  <td className="py-2 pr-4 font-medium text-zinc-200">{scope === '7d' ? 'Last 7d' : 'Last 28d'}</td>
                  <td colSpan={4} className="py-2 text-zinc-500">No snapshot yet.</td>
                </tr>
              )
              const dClicks = fmtDelta(c.clicks, p?.clicks, 'count')
              const dImpr = fmtDelta(c.impressions, p?.impressions, 'count')
              const dCtr = fmtDelta(c.ctr, p?.ctr, 'pct')
              const dPos = fmtDelta(c.position, p?.position, 'pos')
              return (
                <tr key={scope} className="border-t border-zinc-800">
                  <td className="py-2 pr-4 font-medium text-zinc-200">{scope === '7d' ? 'Last 7d' : 'Last 28d'}</td>
                  <td className="py-2 pr-4">{fmtNum(c.clicks)} <span className={`text-xs ml-1 ${dClicks.color}`}>{dClicks.text}</span></td>
                  <td className="py-2 pr-4">{fmtNum(c.impressions)} <span className={`text-xs ml-1 ${dImpr.color}`}>{dImpr.text}</span></td>
                  <td className="py-2 pr-4">{fmtPct(c.ctr)} <span className={`text-xs ml-1 ${dCtr.color}`}>{dCtr.text}</span></td>
                  <td className="py-2 pr-4">{fmtPos(c.position)} <span className={`text-xs ml-1 ${dPos.color}`}>{dPos.text}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Counts strip — kit MetricCards (same counts, new presentation) */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Proposed" value={proposed.length} info={<MetricInfo docKey="seo_pulse_queue" />} />
        <MetricCard label="Accepted" value={accepted.length} info={<MetricInfo docKey="seo_pulse_queue" />} />
        <MetricCard label="Executed" value={executed.length} info={<MetricInfo docKey="seo_pulse_queue" />} />
        <MetricCard label="Critical (proposed)" value={byPriority.critical} info={<MetricInfo docKey="seo_pulse_queue" />} />
        <MetricCard label="High (proposed)" value={byPriority.high} info={<MetricInfo docKey="seo_pulse_queue" />} />
      </div>

      {/* Proposed queue */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Proposed</h2>
        {sortedProposed.length === 0 ? (
          <p className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 rounded p-4">
            No proposed actions. Triage cron runs Mondays at 07:00 UTC.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedProposed.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        )}
      </section>

      {/* Accepted queue */}
      {accepted.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Accepted — awaiting execution</h2>
          <div className="space-y-2">
            {accepted.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        </section>
      )}

      {/* Executed queue */}
      {executed.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Executed — measuring</h2>
          <div className="space-y-2 opacity-70">
            {executed.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActionCard({ action }: { action: ActionRow }) {
  const m = action.metadata ?? {}
  const basePos = action.baseline_position ?? m.baseline_position ?? null
  const baseImpr = action.baseline_impressions ?? m.baseline_impressions ?? null
  const baseClicks = action.baseline_clicks ?? m.baseline_clicks ?? null
  const baseCtr = action.baseline_ctr ?? m.baseline_ctr ?? null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${PRIORITY_STYLES[action.priority]}`}>
            {action.priority}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {action.action_type.replace(/_/g, ' ')}
          </span>
          {m.scope && <span className="text-[10px] text-zinc-600">· {m.scope}</span>}
          {m.signal && <span className="text-[10px] text-zinc-600">· {m.signal}</span>}
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ml-auto ${STATUS_STYLES[action.status]}`}>
            {action.status}
          </span>
        </div>

        <Link
          href={`https://rightaichoice.com${action.page}`}
          target="_blank"
          className="block font-mono text-xs text-cyan-400 hover:text-cyan-300 break-all mb-2"
        >
          {action.page}
        </Link>

        <p className="text-sm text-zinc-300 leading-relaxed mb-2">{action.reason}</p>

        <div className="flex gap-4 text-xs text-zinc-500">
          <span>pos <span className="text-zinc-300">{fmtPos(basePos)}</span></span>
          <span>impr <span className="text-zinc-300">{fmtNum(baseImpr)}</span></span>
          <span>clicks <span className="text-zinc-300">{fmtNum(baseClicks)}</span></span>
          <span>CTR <span className="text-zinc-300">{fmtPct(baseCtr)}</span></span>
          {m.delta_position !== null && m.delta_position !== undefined && (
            <span>
              Δpos <span className={deltaColor(m.delta_position, 'pos')}>{m.delta_position > 0 ? '+' : ''}{m.delta_position.toFixed(1)}</span>
            </span>
          )}
        </div>
        {m.dominant_query && (
          <div className="text-xs text-zinc-600 mt-2">
            dominant query: <em className="text-zinc-400">{m.dominant_query}</em>
          </div>
        )}

        {/* 2026-06-28 — REAL apply for title rewrites: type the new title and
            this writes a live title_override (+ recrawl signal) and marks the
            action executed. (Accept/Reject only change workflow status.) */}
        {action.action_type === 'title_rewrite' && action.status !== 'executed' && (
          <form action={applyTitleAction} className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <input type="hidden" name="id" value={action.id} />
            <input
              type="text"
              name="title"
              required
              minLength={10}
              maxLength={80}
              placeholder="New page title — 10–80 chars, end with “ | RightAIChoice”"
              className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
            >
              Apply title →
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        {action.status === 'proposed' && (
          <>
            <form action={acceptAction}>
              <input type="hidden" name="id" value={action.id} />
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
              >
                Accept
              </button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="id" value={action.id} />
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
              >
                Reject
              </button>
            </form>
          </>
        )}
        {action.status === 'accepted' && (
          <>
            <form action={markExecuted}>
              <input type="hidden" name="id" value={action.id} />
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
              >
                Mark executed
              </button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="id" value={action.id} />
              <button
                type="submit"
                className="w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
              >
                Revoke
              </button>
            </form>
          </>
        )}
        {action.status === 'executed' && (
          <span className="text-[10px] text-zinc-500 px-2 py-1">
            measured in 4 weeks
          </span>
        )}
      </div>
    </div>
  )
}
