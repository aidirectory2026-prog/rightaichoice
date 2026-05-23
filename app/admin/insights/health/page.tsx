// Phase 8.g.9 (2026-05-21) — /admin/insights/health — per-event freshness
// + property-quality audit. Answers "how do I trust this data?"

import Link from 'next/link'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { getEventHealth, getVolumeProjection } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Event health — Admin' }

function fmtAgo(iso: string | null): { label: string; status: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!iso) return { label: 'never', status: 'gray' }
  const ms = Date.now() - new Date(iso).getTime()
  const h = ms / 1000 / 60 / 60
  if (h < 1) return { label: `${Math.max(1, Math.floor(ms / 60000))}m ago`, status: 'green' }
  if (h < 24) return { label: `${Math.floor(h)}h ago`, status: 'green' }
  const d = Math.floor(h / 24)
  if (d < 7) return { label: `${d}d ago`, status: 'yellow' }
  if (d < 30) return { label: `${d}d ago`, status: 'red' }
  return { label: `${d}d ago`, status: 'red' }
}

function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' | 'gray' }) {
  const color = status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-amber-500' : status === 'red' ? 'bg-red-500' : 'bg-zinc-700'
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

function pctColor(pct: number): string {
  if (pct >= 95) return 'text-emerald-300'
  if (pct >= 75) return 'text-amber-300'
  return 'text-red-300'
}

export default async function HealthPage() {
  const [{ fired, deadEventNames, freshnessPct }, volume] = await Promise.all([
    getEventHealth(30),
    getVolumeProjection(),
  ])

  const liveCount = fired.length
  const totalCatalog = liveCount + deadEventNames.length

  // Volume budget color
  const capStatus = !volume ? 'gray'
    : volume.pct_of_cap >= 95 ? 'red'
    : volume.pct_of_cap >= 85 ? 'amber'
    : volume.pct_of_cap >= 70 ? 'yellow'
    : 'green'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/insights" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />
            Insights
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Event health
          </h1>
        </div>
        <div className="text-xs text-zinc-500">
          <span className={freshnessPct >= 70 ? 'text-emerald-300' : freshnessPct >= 40 ? 'text-amber-300' : 'text-red-300'}>
            {liveCount} of {totalCatalog} events fired in last 7d ({freshnessPct}%)
          </span>
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        For every event in <span className="text-zinc-400">scripts/mixpanel/config/events.ts</span> + every event
        that&apos;s fired in the last 30 days: when it last fired, count over 24h/7d/30d, and what % of rows have the
        critical super-properties attached (device_type, page_path, auth_state). If any of those columns shows &lt;95%
        for an event with high volume, the instrumentation at that call site likely doesn&apos;t pass the super-prop
        bridge correctly.
      </p>

      {/* ── Volume budget tile ────────────────────────────────────── */}
      {volume && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-200">Mixpanel free-tier volume budget</div>
            <span className={`rounded px-2 py-0.5 text-xs font-mono ${
              capStatus === 'red' ? 'bg-red-900/40 text-red-300'
              : capStatus === 'amber' ? 'bg-amber-900/40 text-amber-300'
              : capStatus === 'yellow' ? 'bg-yellow-900/40 text-yellow-300'
              : 'bg-emerald-900/40 text-emerald-300'
            }`}>
              {volume.pct_of_cap}% of cap
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Today</div>
              <div className="text-lg font-mono text-zinc-100">{volume.today_events.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Month-to-date</div>
              <div className="text-lg font-mono text-zinc-100">{volume.mtd_events.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">30d avg/day</div>
              <div className="text-lg font-mono text-zinc-100">{Math.round(volume.rolling_30d_avg).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Projected month-end</div>
              <div className="text-lg font-mono text-emerald-300">{volume.projected_month_end.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Free-tier cap</div>
              <div className="text-lg font-mono text-zinc-400">{(volume.free_tier_cap / 1_000_000).toFixed(0)}M / mo</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-zinc-950">
            <div
              className={
                capStatus === 'red' ? 'h-full bg-red-700'
                : capStatus === 'amber' ? 'h-full bg-amber-700'
                : capStatus === 'yellow' ? 'h-full bg-yellow-700'
                : 'h-full bg-emerald-700'
              }
              style={{ width: `${Math.min(100, volume.pct_of_cap)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">
            Projection = month-to-date + (30-day rolling avg × remaining days in month). Mixpanel free tier resets monthly.
          </p>
        </div>
      )}

      {/* ── Live events table ──────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Last fire</th>
              <th className="px-3 py-2 text-right">24h</th>
              <th className="px-3 py-2 text-right">7d</th>
              <th className="px-3 py-2 text-right">30d</th>
              <th className="px-3 py-2 text-right">device_type</th>
              <th className="px-3 py-2 text-right">page_path</th>
              <th className="px-3 py-2 text-right">auth_state</th>
            </tr>
          </thead>
          <tbody>
            {fired.map((r) => {
              const ago = fmtAgo(r.last_fire)
              return (
                <tr key={r.event_name} className="border-b border-zinc-900 hover:bg-zinc-900/30">
                  <td className="px-3 py-2"><StatusDot status={ago.status} /></td>
                  <td className="px-3 py-2 font-mono text-emerald-300">
                    <Link href={`/admin/insights/events?event_name=${encodeURIComponent(r.event_name)}&days=7`} className="hover:underline">
                      {r.event_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-400" title={r.last_fire ?? ''}>{ago.label}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{r.fires_24h.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{r.fires_7d.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{r.fires_30d.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pctColor(r.pct_device_type)}`}>{r.pct_device_type}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${pctColor(r.pct_page_path)}`}>{r.pct_page_path}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${pctColor(r.pct_auth_state)}`}>{r.pct_auth_state}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Dead events ──────────────────────────────────────────────── */}
      {deadEventNames.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-300">
            <StatusDot status="red" />
            {deadEventNames.length} dead events (defined in catalog but never fired in last 30d)
          </div>
          <p className="mb-3 text-xs text-zinc-400">
            These events have an entry in <span className="font-mono">scripts/mixpanel/config/events.ts</span> but
            have not fired even once in the last 30 days. Either the call site is missing in the React code, or the
            triggering UI surface isn&apos;t being reached. Wire them or trim them from the catalog.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {deadEventNames.map((n) => (
              <span key={n} className="rounded bg-red-950/40 px-2 py-0.5 font-mono text-[11px] text-red-300">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
