// Phase 10.9 (2026-06-13) — tracking-health dashboard, rebuilt.
//
// Three provable views, all from real data:
//   1. Latest cycle — the newest tracking_health batch (the means the banner
//      reads: V_registry/V_schema/V_synthetic/V_filters/V_mixpanel/V_invariants
//      from nightly-verify.ts, PLUS the in-DB I* invariants from pg_cron).
//   2. Invariant history — the last ~30 batches, each as a pass/warn/fail
//      strip, so the owner sees the streak and any regression over time.
//   3. Verified wall — every fired event (synthetic-coverage.json × the schema
//      registry) with its last synthetic-verified status, mode and lifecycle.
//   4. Schema-violation trend — I9_schema_violation_rate over recent runs.
//
// Data sources: public.tracking_health (admin client) + docs/admin/
// synthetic-coverage.json (written by the synthetic suite) + lib/analytics-*.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { EVENT_SCHEMAS, SCHEMA_EVENT_NAMES, SERVER_ONLY_EVENTS, type EventSchemaEntry } from '@/lib/analytics-schema'
import { eventLifecycle } from '@/lib/admin/event-props'
import { DailyChart, SectionHeading, type ChartPoint } from '@/components/admin/charts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Tracking health — Admin' }

type Status = 'pass' | 'warn' | 'fail'
type HealthRow = {
  check_key: string
  status: Status
  value: number | null
  threshold: number | null
  detail: string | null
  run_at: string
}

type SyntheticEvent = { event: string; mode: string; pass: boolean; ms?: number; note?: string; error?: string }
type Coverage = {
  generated_at: string
  runid: string
  summary: { total_fired_events: number; verified: number; failed: number; negative_test?: string }
  events: SyntheticEvent[]
}

function batchStatus(rows: { status: Status }[]): Status {
  if (rows.some((r) => r.status === 'fail')) return 'fail'
  if (rows.some((r) => r.status === 'warn')) return 'warn'
  return 'pass'
}

function loadCoverage(): Coverage | null {
  try {
    const p = join(process.cwd(), 'docs', 'admin', 'synthetic-coverage.json')
    return JSON.parse(readFileSync(p, 'utf8')) as Coverage
  } catch {
    return null
  }
}

export default async function TrackingHealthPage() {
  const db = getAdminClient()

  // Pull a generous slice (covers ~30 batches × ~25 checks) ordered newest-first.
  const { data } = await db
    .from('tracking_health')
    .select('check_key, status, value, threshold, detail, run_at')
    .order('run_at', { ascending: false })
    .limit(1200)
  const all = (data as HealthRow[]) ?? []

  // Group into batches by run_at (preserving newest-first order).
  const byRun = new Map<string, HealthRow[]>()
  for (const r of all) {
    if (!byRun.has(r.run_at)) byRun.set(r.run_at, [])
    byRun.get(r.run_at)!.push(r)
  }
  const batches = [...byRun.entries()].map(([run_at, rows]) => ({ run_at, rows }))
  const latest = batches[0] ?? null
  const overall: Status | null = latest ? batchStatus(latest.rows) : null

  // I9 schema-violation trend across the recent batches that contain it.
  const i9Points: ChartPoint[] = batches
    .map((b) => {
      const row = b.rows.find((r) => r.check_key === 'I9_schema_violation_rate')
      if (!row || row.value == null) return null
      return { date: b.run_at.slice(0, 10), value: Number(row.value) }
    })
    .filter((p): p is ChartPoint => p !== null)
    .reverse() // oldest → newest for the chart
    .slice(-30)

  const coverage = loadCoverage()

  // Verified wall — every fired event, its last synthetic-verified status.
  const covByEvent = new Map<string, SyntheticEvent>()
  for (const e of coverage?.events ?? []) covByEvent.set(e.event, e)
  const wall = SCHEMA_EVENT_NAMES.map((name) => {
    const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[name]
    const cov = covByEvent.get(name)
    const lifecycle = eventLifecycle(name)
    return {
      name,
      category: entry?.category ?? '—',
      serverOnly: SERVER_ONLY_EVENTS.has(name),
      mode: cov?.mode ?? null,
      pass: cov ? cov.pass : null,
      note: cov?.note,
      error: cov?.error,
      lifecycle: lifecycle.status,
    }
  })
  const wallVerified = wall.filter((w) => w.pass === true).length
  const wallFailed = wall.filter((w) => w.pass === false).length
  const wallUntested = wall.filter((w) => w.pass === null).length
  const wallAllGreen = wallFailed === 0 && wallUntested === 0 && wall.length > 0

  return (
    <div className="space-y-2">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-white">Tracking health</h1>
        {overall ? <StatusPill status={overall} /> : null}
      </div>
      <p className="mb-6 max-w-3xl text-xs leading-relaxed text-zinc-500">
        The verification record for the analytics layer. The{' '}
        <span className="font-mono text-zinc-300">V_*</span> rows are the nightly
        orchestrator (<span className="font-mono">nightly-verify.ts</span>, 21:00 UTC) — registry guard, schema-violation
        read, synthetic suite, filter matrix, Mixpanel reconciliation, and a roll-up of the in-DB
        invariants. The <span className="font-mono">I*</span> rows are the in-DB invariant suite (
        <span className="font-mono">run_tracking_invariants()</span> via pg_cron, 19:30 UTC). The
        admin trust banner reads the newest batch: any{' '}
        <span className="text-red-400">fail</span> turns it red, a{' '}
        <span className="text-amber-400">warn</span> amber. tracking-watchdog (8AM UTC) emails on fail.
      </p>

      {/* ── 1. Latest cycle ───────────────────────────────────────────── */}
      <SectionHeading
        title="Latest cycle"
        subtitle={latest ? `Newest batch — ${new Date(latest.run_at).toISOString()}` : 'No runs yet.'}
      />
      {!latest ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400">
          No tracking_health rows yet. The in-DB suite seeds on migration and runs nightly via pg_cron;
          the nightly orchestrator runs at 21:00 UTC.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Check</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-right">Threshold</th>
                <th className="px-4 py-2 text-left">What it guards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[...latest.rows]
                .sort((a, b) => a.check_key.localeCompare(b.check_key))
                .map((r) => (
                  <tr key={r.check_key} className="bg-zinc-950/30">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-200">{r.check_key}</td>
                    <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">{r.value ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-500">{r.threshold ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-zinc-400">{r.detail}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 2. Invariant history ──────────────────────────────────────── */}
      <SectionHeading
        title="History"
        subtitle={`Last ${Math.min(batches.length, 30)} batches — each strip is pass / warn / fail counts. Streak of green = healthy.`}
      />
      {batches.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400">No history yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Run (UTC)</th>
                <th className="px-4 py-2 text-left">Result</th>
                <th className="px-4 py-2 text-right">Pass</th>
                <th className="px-4 py-2 text-right">Warn</th>
                <th className="px-4 py-2 text-right">Fail</th>
                <th className="px-4 py-2 text-left">Failing / warning checks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {batches.slice(0, 30).map((b) => {
                const pass = b.rows.filter((r) => r.status === 'pass').length
                const warn = b.rows.filter((r) => r.status === 'warn').length
                const fail = b.rows.filter((r) => r.status === 'fail').length
                const flagged = b.rows
                  .filter((r) => r.status !== 'pass')
                  .map((r) => r.check_key)
                  .join(', ')
                return (
                  <tr key={b.run_at} className="bg-zinc-950/30">
                    <td className="px-4 py-2 font-mono text-[11px] text-zinc-400">
                      {new Date(b.run_at).toISOString().replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="px-4 py-2"><StatusPill status={batchStatus(b.rows)} /></td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-400">{pass}</td>
                    <td className="px-4 py-2 text-right font-mono text-amber-400">{warn || ''}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-400">{fail || ''}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{flagged || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 3. Schema-violation trend ─────────────────────────────────── */}
      <SectionHeading
        title="Schema-violation trend"
        subtitle="I9 — percent of client events tagged schema_valid=false by /api/track-mirror (warn >1, fail >5). Lower is better."
      />
      {i9Points.length < 2 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-xs text-zinc-500">
          Need ≥2 batches with I9 to chart a trend.
        </div>
      ) : (
        <DailyChart title="schema_valid=false rate (%)" points={i9Points} />
      )}

      {/* ── 4. Verified wall ──────────────────────────────────────────── */}
      <SectionHeading
        title="Verified wall"
        subtitle={
          coverage
            ? `Every fired event with its last synthetic-verified status (run ${coverage.runid}, ${new Date(coverage.generated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC). Green wall = every event proven end-to-end.`
            : 'No synthetic-coverage.json found — run npm run tracking:synthetic.'
        }
      />
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <WallStat label="verified" value={wallVerified} cls="text-emerald-300" />
        <WallStat label="failed" value={wallFailed} cls="text-red-300" />
        <WallStat label="untested" value={wallUntested} cls="text-zinc-400" />
        <span className={`rounded px-2 py-0.5 font-medium ${wallAllGreen ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
          {wallAllGreen ? `ALL GREEN — ${wall.length}/${wall.length}` : `${wallVerified}/${wall.length} proven`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {wall.map((w) => {
          const tone =
            w.pass === true
              ? 'border-emerald-900/60 bg-emerald-950/20'
              : w.pass === false
                ? 'border-red-900 bg-red-950/30'
                : 'border-zinc-800 bg-zinc-900/30'
          return (
            <div key={w.name} className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 ${tone}`}>
              <div className="min-w-0">
                <div className="truncate font-mono text-[11px] text-zinc-200">{w.name}</div>
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-zinc-600">
                  <span>{w.category}</span>
                  {w.serverOnly ? <span className="text-violet-500">server-only</span> : null}
                  {w.lifecycle !== 'fired' ? <span className="text-amber-500">{w.lifecycle}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className={`text-[10px] font-semibold uppercase ${
                    w.pass === true ? 'text-emerald-400' : w.pass === false ? 'text-red-400' : 'text-zinc-600'
                  }`}
                  title={w.error ?? w.note ?? ''}
                >
                  {w.pass === true ? '✓ verified' : w.pass === false ? '✗ failed' : '— untested'}
                </span>
                {w.mode ? <span className="text-[9px] text-zinc-600">{w.mode}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WallStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-500">
      <span className={`font-mono font-semibold ${cls}`}>{value}</span> {label}
    </span>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    pass: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
    warn: 'bg-amber-900/40 text-amber-300 border-amber-800',
    fail: 'bg-red-900/40 text-red-300 border-red-800',
  } as const
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border ${map[status]}`}>
      {status}
    </span>
  )
}
