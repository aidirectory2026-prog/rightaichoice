import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline Health' }

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

const STALE_DAYS = 8 // no success in this long → flag (covers weekly jobs)
const DAY_MS = 86_400_000

function ago(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const h = ms / 3_600_000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}m ago`
  if (h < 48) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}
function dur(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}
function isStale(r: Health): boolean {
  if (!r.last_success_at) return true
  return Date.now() - new Date(r.last_success_at).getTime() > STALE_DAYS * DAY_MS
}

const STATUS_STYLE: Record<string, string> = {
  success: 'border-emerald-700 text-emerald-300 bg-emerald-950/50',
  failure: 'border-rose-700 text-rose-300 bg-rose-950/50',
  timeout: 'border-rose-700 text-rose-300 bg-rose-950/50',
  partial: 'border-amber-700 text-amber-300 bg-amber-950/50',
  running: 'border-sky-700 text-sky-300 bg-sky-950/50',
}

export default async function PipelineHealthPage() {
  const { data } = await getAdminClient().rpc('pipeline_health')
  const rows = (data ?? []) as Health[]

  const failing = rows.filter((r) => r.last_status === 'failure' || r.last_status === 'timeout')
  const stale = rows.filter((r) => isStale(r) && !failing.includes(r))
  const healthy = rows.length - failing.length - stale.length
  const cost7d = rows.reduce((s, r) => s + (Number(r.cost_7d) || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline Health</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Last run, last success, and recent failures for every cron/job (from <code>pipeline_runs</code>).
          Sorted worst-first. Stale = no success in {STALE_DAYS}d.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Healthy" value={String(healthy)} tone="ok" />
        <Kpi label="Failing" value={String(failing.length)} tone={failing.length ? 'bad' : 'ok'} />
        <Kpi label="Stale" value={String(stale.length)} tone={stale.length ? 'warn' : 'ok'} />
        <Kpi label="7d cost" value={`$${cost7d.toFixed(2)}`} />
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">
            No pipeline runs recorded yet.
          </div>
        ) : (
          rows.map((r) => {
            const staleFlag = isStale(r) && r.last_status !== 'failure' && r.last_status !== 'timeout'
            return (
              <div
                key={r.pipeline_key}
                className={`rounded-lg border bg-zinc-900/40 p-3 ${
                  failing.includes(r) ? 'border-rose-900/60' : staleFlag ? 'border-amber-900/50' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLE[r.last_status] ?? 'border-zinc-700 text-zinc-400'}`}>
                      {r.last_status}
                    </span>
                    <span className="font-mono text-sm text-zinc-200 truncate">{r.pipeline_key}</span>
                    {staleFlag && <span className="text-xs text-amber-400">stale</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
                    <span>ok {ago(r.last_success_at)}</span>
                    <span className={r.failures_24h > 0 ? 'text-rose-400' : ''}>{r.failures_24h} fail/24h</span>
                    <span className={r.failures_7d > 0 ? 'text-amber-400' : ''}>{r.failures_7d} fail/7d</span>
                    <span>{r.runs_7d} runs/7d</span>
                    <span>~{dur(r.avg_duration_ms)}</span>
                    {Number(r.cost_7d) > 0 && <span>${Number(r.cost_7d).toFixed(2)}</span>}
                  </div>
                </div>
                {r.last_error && (failing.includes(r) || staleFlag) && (
                  <p className="mt-2 text-xs text-rose-300/80 font-mono truncate">{r.last_error}</p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'warn' }) {
  const color = tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
