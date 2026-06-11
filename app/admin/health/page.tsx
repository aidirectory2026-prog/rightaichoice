// Phase 9 — automation observability + reliability dashboard.
//
// Server-rendered (getAdminClient) from the existing pipeline_runs table
// (written by lib/pipelines/with-logging.ts cronRoute()) plus the A1
// catalog freshness SLA (fresh-7day-sla, same SQL as /admin/data-audit).
//
// Sections:
//   1. SLA banner            — catalog 7-day freshness + count of stale/failing pipelines.
//   2. Per-pipeline status   — LAST run per pipeline_key: status pill, finished-at
//                              (relative + IST), items proc/ok/fail, duration, est cost,
//                              cadence + SLA verdict. Failures/stale sorted first.
//   3. 24h failures          — explicit list of failed/timeout runs in the last 24h.
//
// pipeline_health() RPC gives the 7d aggregates (runs, failures, last_success,
// avg duration, 7d cost). A bounded distinct-on query adds the LAST run's
// per-run items + duration + est cost (the RPC only carries averages/sums).
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Pipeline Health — Admin' }

// ── Aggregates from the pipeline_health() RPC ──────────────────────
type Health = {
  pipeline_key: string
  last_status: string
  last_started_at: string | null
  last_success_at: string | null
  runs_7d: number
  failures_24h: number
  failures_7d: number
  avg_duration_ms: number | null
  last_error: string | null
  cost_7d: number | null
}

// ── Last-run detail (distinct-on) ──────────────────────────────────
type LastRun = {
  pipeline_key: string
  source: string
  status: string
  finished_at: string | null
  started_at: string | null
  duration_ms: number | null
  items_processed: number | null
  items_succeeded: number | null
  items_failed: number | null
  estimated_cost_usd: number | null
  error_class: string | null
  error_message: string | null
}

type FailedRun = {
  pipeline_key: string
  source: string
  started_at: string
  error_class: string | null
  error_message: string | null
}

type FreshnessSla = {
  breaching: number
  never_verified: number
  total: number
  worst_age_days: number
}

// Expected cadence per known pipeline (hours between successful runs).
// Derived from vercel.json crons + GH Actions workflow schedules. A pipeline
// whose last success is older than (cadence * SLA_SLACK) is flagged stale.
// Daily jobs get the hard 36h rule from the spec.
// F12 (metric-audit.md): map corrected against observed success gaps +
// vercel.json — calculate-viability is NOT daily (success gaps up to ~354h),
// and 8 previously-unmapped live keys got real cadences instead of the
// 8-day fallback (submit-urls-bing was a failing daily job hiding behind it).
const CADENCE_HOURS: Record<string, number> = {
  'refresh-tools': 1, // hourly
  'onboard-tools': 1, // 7,37 * * * *
  'poll-gh-actions': 1, // */10 (GH workflow) → at least hourly success expected
  'alert-failed-pipelines': 1, // */30
  'cron-pipelines': 1, // umbrella — many jobs, runs frequently
  'cascade-hubs': 2, // F12: every 2h
  'refresh-latest-updates': 24, // daily 02:00
  'freshness-batch': 24, // daily 02:00 (GH)
  'cleanup-user-events': 24, // daily 03:15
  'refresh-freshness-view': 24, // daily 23:45
  'snapshot-daily-updates': 24, // daily 23:55
  'submit-urls-bing': 24, // F12: daily (currently flaky — was unmapped, hidden by 8d fallback)
  'indexnow-recent': 24, // F12: daily
  'refresh-faqs': 48, // every 2 days
  'discover-tutorials': 72, // a few times a week
  'generate-editorials': 168, // weekly
  'scrape-sentiment': 168, // weekly
  'refresh-compare-editorials': 168, // weekly-ish
  'email-weekly-digest': 168, // weekly
  'snapshot-gsc': 168, // F12: weekly
  'seo-impact': 168, // F12: weekly
  'resubmit-sitemap-gsc': 168, // F12: weekly
  'triage-gsc': 168, // F12: weekly
  'calculate-viability': 360, // F12: ~15d — real success gaps up to 353.7h; 24h caused false hard-FAILs
}

// F12: failure-only monitor keys — these log a pipeline_runs row ONLY when
// the monitored condition breaches (freshness SLA, GH-Actions heartbeat), so
// "last success" never exists and success-SLA verdicts read forever-failing.
// They get their own section below instead of polluting the SLA table/KPIs.
const MONITOR_KEYS = new Set(['freshness-sla', 'poll-gh-actions-heartbeat'])

const HARD_DAILY_SLA_HOURS = 36 // spec: a daily job that hasn't succeeded in >36h = FAIL
const SLA_SLACK = 2.5 // allow 2.5× the nominal cadence before flagging (covers retries/skew)
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

// ── A1 catalog freshness SLA (same SQL as data-audit fresh-7day-sla) ──
const FRESHNESS_SLA_SQL = `
  SELECT
    count(*) FILTER (WHERE now() - last_verified_at > interval '7 days')::int AS breaching,
    count(*) FILTER (WHERE last_verified_at IS NULL)::int AS never_verified,
    count(*)::int AS total,
    coalesce(max(extract(epoch FROM now() - last_verified_at) / 86400), 0)::numeric AS worst_age_days
  FROM tools WHERE is_published = true`

function ago(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const h = ms / HOUR_MS
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}m ago`
  if (h < 48) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}
function ist(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function dur(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}
function cost(usd: number | null): string {
  const n = Number(usd) || 0
  return n > 0 ? `$${n.toFixed(4)}` : '—'
}

type SlaVerdict = { state: 'ok' | 'stale' | 'fail'; label: string }
function evaluateSla(h: Health): SlaVerdict {
  const cadence = CADENCE_HOURS[h.pipeline_key]
  if (!h.last_success_at) {
    return { state: 'fail', label: 'never succeeded' }
  }
  const ageH = (Date.now() - new Date(h.last_success_at).getTime()) / HOUR_MS
  // Hard rule: a daily-or-faster job with no success in 36h = FAIL.
  if (cadence !== undefined && cadence <= 24 && ageH > HARD_DAILY_SLA_HOURS) {
    return { state: 'fail', label: `no success in ${Math.round(ageH)}h (>36h)` }
  }
  if (cadence !== undefined) {
    const limit = cadence * SLA_SLACK
    if (ageH > limit) {
      return { state: 'stale', label: `${Math.round(ageH)}h since success (cadence ~${cadence}h)` }
    }
    return { state: 'ok', label: `~${cadence}h cadence` }
  }
  // Unknown pipeline (no cadence map entry): fall back to an 8-day stale rule.
  if (ageH > 8 * 24) return { state: 'stale', label: `no success in ${Math.round(ageH / 24)}d` }
  return { state: 'ok', label: 'unmapped cadence' }
}

export default async function PipelineHealthPage() {
  const db = getAdminClient()

  // 1. Aggregates (7d) from the RPC.
  const { data: healthData } = await db.rpc('pipeline_health')
  const health = ((healthData ?? []) as Health[])

  // 2. Last-run detail per pipeline_key (bounded: distinct-on collapses to one
  //    row per key; pipeline_runs has ~13 distinct keys, so this is tiny).
  const { data: lastData } = await (db as unknown as {
    rpc: (fn: string, args: { p_sql: string }) => Promise<{ data: unknown }>
  }).rpc('_admin_audit_exec', {
    p_sql: `
      SELECT DISTINCT ON (pipeline_key)
        pipeline_key, source, status, finished_at, started_at, duration_ms,
        items_processed, items_succeeded, items_failed, estimated_cost_usd,
        error_class, error_message
      FROM pipeline_runs
      ORDER BY pipeline_key, started_at DESC`,
  })
  const lastRuns = (Array.isArray(lastData) ? (lastData as LastRun[]) : [])
  const lastByKey = new Map(lastRuns.map((r) => [r.pipeline_key, r]))

  // 3. 24h failures list (bounded explicitly).
  const { data: failData } = await db
    .from('pipeline_runs')
    .select('pipeline_key, source, started_at, error_class, error_message')
    .in('status', ['failure', 'timeout'])
    .gte('created_at', new Date(Date.now() - DAY_MS).toISOString())
    .order('started_at', { ascending: false })
    .limit(50)
  const failures24h = ((failData ?? []) as FailedRun[])

  // 4. Catalog freshness SLA (A1).
  const { data: freshData } = await (db as unknown as {
    rpc: (fn: string, args: { p_sql: string }) => Promise<{ data: unknown }>
  }).rpc('_admin_audit_exec', { p_sql: FRESHNESS_SLA_SQL })
  const freshRow = (Array.isArray(freshData) ? freshData[0] : freshData) as FreshnessSla | undefined
  const fresh: FreshnessSla = {
    breaching: Number(freshRow?.breaching ?? 0),
    never_verified: Number(freshRow?.never_verified ?? 0),
    total: Number(freshRow?.total ?? 0),
    worst_age_days: Number(freshRow?.worst_age_days ?? 0),
  }
  const freshPass = fresh.breaching === 0 && fresh.never_verified === 0 && fresh.worst_age_days < 7

  // ── Derive per-pipeline rows with SLA verdict, sort worst-first. ──
  type Row = Health & { sla: SlaVerdict; last: LastRun | undefined }

  // F12: failure-only monitors get their own section — success-SLA verdicts
  // don't apply to keys that only log on breach.
  const monitorRows: Row[] = health
    .filter((h) => MONITOR_KEYS.has(h.pipeline_key))
    .map((h) => ({ ...h, sla: { state: 'ok' as const, label: 'failure-only monitor' }, last: lastByKey.get(h.pipeline_key) }))

  // F12: a CADENCE_HOURS key with ZERO pipeline_runs rows ever is a silent
  // blind spot (it never appears in pipeline_health at all) — surface it as
  // an explicit red row instead of being invisible.
  const loggedKeys = new Set(health.map((h) => h.pipeline_key))
  const neverLogged: Row[] = Object.keys(CADENCE_HOURS)
    .filter((k) => !MONITOR_KEYS.has(k) && !loggedKeys.has(k))
    .map((k) => ({
      pipeline_key: k,
      last_status: 'missing',
      last_started_at: null,
      last_success_at: null,
      runs_7d: 0,
      failures_24h: 0,
      failures_7d: 0,
      avg_duration_ms: null,
      last_error: null,
      cost_7d: null,
      sla: { state: 'fail' as const, label: `expected ~${CADENCE_HOURS[k]}h cadence but never logged a run` },
      last: undefined,
    }))

  const rows: Row[] = [
    ...health
      .filter((h) => !MONITOR_KEYS.has(h.pipeline_key))
      .map((h) => ({ ...h, sla: evaluateSla(h), last: lastByKey.get(h.pipeline_key) })),
    ...neverLogged,
  ]

  function rank(r: Row): number {
    if (r.last_status === 'failure' || r.last_status === 'timeout' || r.sla.state === 'fail') return 0
    if (r.sla.state === 'stale') return 1
    if (r.last_status === 'partial') return 2
    return 3
  }
  rows.sort((a, b) => rank(a) - rank(b) || a.pipeline_key.localeCompare(b.pipeline_key))

  const failingCount = rows.filter((r) => rank(r) === 0).length
  const staleCount = rows.filter((r) => r.sla.state === 'stale' && rank(r) !== 0).length
  const healthyCount = rows.length - failingCount - staleCount
  const cost7d = rows.reduce((s, r) => s + (Number(r.cost_7d) || 0), 0)

  // F8 (metric-audit.md) — no pipeline_runs row has EVER logged a nonzero
  // estimated_cost_usd (handlers never call ctx.recordTokens/recordApifyUsd).
  // "$0.00" on a money KPI is misleading green; show the honest state until
  // cost instrumentation exists. Exact check against the whole table — it's
  // a single indexed count.
  const { data: costEverData } = await (db as unknown as {
    rpc: (fn: string, args: { p_sql: string }) => Promise<{ data: unknown }>
  }).rpc('_admin_audit_exec', {
    p_sql: `SELECT count(*)::int AS n FROM pipeline_runs WHERE coalesce(estimated_cost_usd, 0) > 0`,
  })
  const costEverRow = (Array.isArray(costEverData) ? costEverData[0] : costEverData) as { n?: number } | undefined
  const costInstrumented = Number(costEverRow?.n ?? 0) > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline Health</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
          Last run, last success, recent failures, and SLA verdict for every cron/job — read live from{' '}
          <code className="text-zinc-300">pipeline_runs</code> (written by{' '}
          <code className="text-zinc-300">cronRoute()</code>). A pipeline is <span className="text-rose-400">failing</span>{' '}
          if its last run failed or it breached the 36h daily SLA; <span className="text-amber-400">stale</span> if its
          last success is older than ~{SLA_SLACK}× its expected cadence.
        </p>
      </div>

      {/* SLA / KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Healthy" value={String(healthyCount)} tone="ok" />
        <Kpi label="Failing" value={String(failingCount)} tone={failingCount ? 'bad' : 'ok'} />
        <Kpi label="Stale" value={String(staleCount)} tone={staleCount ? 'warn' : 'ok'} />
        <Kpi label="Fails / 24h" value={String(failures24h.length)} tone={failures24h.length ? 'bad' : 'ok'} />
        {costInstrumented ? (
          <Kpi label="7d est cost" value={`$${cost7d.toFixed(2)}`} />
        ) : (
          <Kpi label="7d est cost" value="Not instrumented (F8)" tone="warn" />
        )}
      </div>

      {/* Catalog freshness SLA (A1) */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-200 mb-2">Catalog freshness SLA (7-day)</h2>
        <div
          className={`rounded-lg border p-4 ${
            freshPass ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-rose-900/50 bg-rose-950/20'
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <StatusPill status={freshPass ? 'success' : 'failure'} />
            <span className="text-sm text-zinc-200">
              {fresh.breaching} over 7d
              {fresh.never_verified > 0 ? ` · ${fresh.never_verified} never-verified` : ''} · worst ={' '}
              {fresh.worst_age_days.toFixed(1)}d of {fresh.total} published
            </span>
          </div>
          {!freshPass && (
            <p className="mt-2 text-xs text-rose-300/80">
              Published tools breach the 7-day freshness SLA — check the freshness-batch refresh-tools job ran and
              isn&apos;t failing/timing out (it cycles the full catalog stalest-first at ~360/day).
            </p>
          )}
        </div>
      </section>

      {/* Per-pipeline status table */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-200 mb-2">Per-pipeline status (last run, worst-first)</h2>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">
            No pipeline runs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Pipeline</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Last finished</th>
                  <th className="px-3 py-2 text-right">Items (p/ok/f)</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                  <th className="px-3 py-2 text-right">Est cost</th>
                  <th className="px-3 py-2 text-left">SLA</th>
                  <th className="px-3 py-2 text-right">Fails 24h/7d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((r) => {
                  const last = r.last
                  const finishedIso = last?.finished_at ?? r.last_started_at
                  return (
                    <tr
                      key={r.pipeline_key}
                      className={
                        rank(r) === 0
                          ? 'bg-rose-950/20'
                          : r.sla.state === 'stale'
                            ? 'bg-amber-950/15'
                            : 'bg-zinc-950/30'
                      }
                    >
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-zinc-200">{r.pipeline_key}</div>
                        <div className="text-[10px] text-zinc-600">{last?.source ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={r.last_status} />
                        {last?.error_class && (
                          <div className="mt-0.5 text-[10px] text-rose-400/80 font-mono">{last.error_class}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-zinc-300">{ago(finishedIso)}</div>
                        <div className="text-[10px] text-zinc-600">{ist(finishedIso)} IST</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400 whitespace-nowrap">
                        {last
                          ? `${last.items_processed ?? 0}/${last.items_succeeded ?? 0}/${last.items_failed ?? 0}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{dur(last?.duration_ms ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{cost(last?.estimated_cost_usd ?? null)}</td>
                      <td className="px-3 py-2">
                        <SlaTag verdict={r.sla} />
                      </td>
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                        <span className={r.failures_24h > 0 ? 'text-rose-400' : 'text-zinc-500'}>{r.failures_24h}</span>
                        <span className="text-zinc-700"> / </span>
                        <span className={r.failures_7d > 0 ? 'text-amber-400' : 'text-zinc-500'}>{r.failures_7d}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* F12: failure-only monitors — breach loggers, not cadence pipelines */}
      {monitorRows.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-200 mb-2">
            Monitors <span className="text-zinc-500 font-normal">(failure-only — a row here is a breach record, not a crashed cron)</span>
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Monitor</th>
                  <th className="px-3 py-2 text-left">Last breach logged</th>
                  <th className="px-3 py-2 text-right">Breaches 24h/7d</th>
                  <th className="px-3 py-2 text-left">Last message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {monitorRows.map((m) => (
                  <tr key={m.pipeline_key} className={m.failures_24h > 0 ? 'bg-amber-950/15' : 'bg-zinc-950/30'}>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-200">{m.pipeline_key}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs text-zinc-300">{ago(m.last_started_at)}</div>
                      <div className="text-[10px] text-zinc-600">{ist(m.last_started_at)} IST</div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                      <span className={m.failures_24h > 0 ? 'text-amber-400' : 'text-zinc-500'}>{m.failures_24h}</span>
                      <span className="text-zinc-700"> / </span>
                      <span className={m.failures_7d > 0 ? 'text-amber-400' : 'text-zinc-500'}>{m.failures_7d}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-400 max-w-md truncate" title={m.last_error ?? ''}>
                      {m.last_error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 24h failures */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-200 mb-2">
          Failures in the last 24h{' '}
          <span className="text-zinc-500 font-normal">({failures24h.length})</span>
        </h2>
        {failures24h.length === 0 ? (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 p-4 text-sm text-emerald-300/80">
            No failed or timed-out runs in the last 24 hours.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">When (IST)</th>
                  <th className="px-3 py-2 text-left">Pipeline</th>
                  <th className="px-3 py-2 text-left">Class</th>
                  <th className="px-3 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {failures24h.map((f, i) => (
                  <tr key={`${f.pipeline_key}-${f.started_at}-${i}`} className="bg-zinc-950/30">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-zinc-400">{ist(f.started_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-200">{f.pipeline_key}</td>
                    <td className="px-3 py-2 font-mono text-xs text-rose-300">{f.error_class ?? 'unknown'}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400 max-w-md truncate" title={f.error_message ?? ''}>
                      {f.error_message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'border-emerald-800 text-emerald-300 bg-emerald-900/40',
    failure: 'border-rose-800 text-rose-300 bg-rose-900/40',
    timeout: 'border-rose-800 text-rose-300 bg-rose-900/40',
    partial: 'border-amber-800 text-amber-300 bg-amber-900/40',
    running: 'border-sky-800 text-sky-300 bg-sky-900/40',
    // F12: synthetic status for expected-but-never-logged pipelines.
    missing: 'border-rose-800 text-rose-300 bg-rose-900/40',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border ${map[status] ?? 'border-zinc-700 text-zinc-400 bg-zinc-900/40'}`}>
      {status}
    </span>
  )
}

function SlaTag({ verdict }: { verdict: SlaVerdict }) {
  const cls =
    verdict.state === 'fail'
      ? 'text-rose-300'
      : verdict.state === 'stale'
        ? 'text-amber-300'
        : 'text-zinc-500'
  return <span className={`text-[11px] ${cls}`}>{verdict.label}</span>
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'warn' }) {
  const color =
    tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
