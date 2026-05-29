// Phase 9.A.4 — tracking-health dashboard. Reads public.tracking_health,
// populated nightly by the pg_cron job `tracking-invariants-nightly`
// (run_tracking_invariants()). This is the in-DB leg of the verification
// strategy; tracking-watchdog.yml reads the same table and alerts on fail.
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Tracking health — Admin' }

type Row = {
  check_key: string
  status: 'pass' | 'warn' | 'fail'
  value: number | null
  threshold: number | null
  detail: string | null
  run_at: string
}

export default async function TrackingHealthPage() {
  const db = getAdminClient()
  // Latest run only.
  const { data: latest } = await db
    .from('tracking_health')
    .select('run_at')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const runAt = (latest as { run_at: string } | null)?.run_at ?? null

  let rows: Row[] = []
  if (runAt) {
    const { data } = await db
      .from('tracking_health')
      .select('check_key, status, value, threshold, detail, run_at')
      .eq('run_at', runAt)
      .order('check_key')
    rows = (data as Row[]) ?? []
  }

  const fails = rows.filter((r) => r.status === 'fail').length
  const warns = rows.filter((r) => r.status === 'warn').length
  const overall = fails > 0 ? 'fail' : warns > 0 ? 'warn' : 'pass'

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">Tracking health</h1>
        <StatusPill status={overall as Row['status']} />
      </div>
      <p className="mb-6 text-xs text-zinc-500">
        In-DB invariant suite — runs nightly via <span className="font-mono">pg_cron</span> (
        <span className="font-mono">tracking-invariants-nightly</span>, 01:00 IST). Last run:{' '}
        <span className="font-mono text-zinc-300">{runAt ? new Date(runAt).toISOString() : 'never'}</span>.
        {' '}A <span className="text-red-400">fail</span> means a number on the dashboards is wrong; a{' '}
        <span className="text-amber-400">warn</span> is a soft anomaly. tracking-watchdog emails on fail.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400">
          No runs yet. The seed run executes on migration; nightly runs at 01:00 IST.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
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
              {rows.map((r) => (
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
    </div>
  )
}

function StatusPill({ status }: { status: Row['status'] }) {
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
