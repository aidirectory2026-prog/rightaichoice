// Phase 10.5a.4 (2026-06-12) — Devices re-skinned onto the Phase-4 shell:
// global FilterBar (full capability set, URL state), chart-kit cards, and
// ⓘ provenance popovers. AdminFilters threaded through every query — the
// breakdown RPC takes p_filters (shared predicate, migration 156); the
// browser/OS select uses the applyFilters() PostgREST mirror — i.e. the
// two paths the filter-matrix verifier proves against raw SQL.

import Link from 'next/link'
import { ChevronLeft, MonitorSmartphone } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { BarList, MetricCard, fmt } from '@/components/admin/charts'
import { applyFilters, filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'
import { resolveServerFilters } from '@/lib/admin/resolve-filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Devices — Admin' }

type DeviceRow = {
  device_type: string
  visitors: number
  events: number
  client_events: number
  server_events: number
  pct_of_total: number
}

type BrowserRow = { browser: string; visitors: number; events: number }
type OsRow = { os: string; visitors: number; events: number }

async function getDevices(f: AdminFilters): Promise<DeviceRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_device_breakdown', {
    p_days: f.range.days,
    p_include_bots: f.includeBots,
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return (data ?? []) as DeviceRow[]
}

// Tiny UA classifier — no external deps. Designed for "what bucket"
// not "which version" so we don't need a full UA parser.
function browserOf(ua: string | null): string {
  if (!ua) return 'unknown'
  if (/edg\//i.test(ua)) return 'Edge'
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari'
  if (/firefox\//i.test(ua)) return 'Firefox'
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera'
  if (/duckduckgo/i.test(ua)) return 'DuckDuckGo'
  if (/samsungbrowser/i.test(ua)) return 'Samsung'
  return 'other'
}

function osOf(ua: string | null): string {
  if (!ua) return 'unknown'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os x/i.test(ua)) return 'macOS'
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/linux/i.test(ua)) return 'Linux'
  if (/cros/i.test(ua)) return 'ChromeOS'
  return 'other'
}

async function getBrowsersAndOs(f: AdminFilters): Promise<{ browsers: BrowserRow[]; oses: OsRow[] }> {
  const db = getAdminClient()
  type Row = { user_agent: string | null; distinct_id: string }
  let q = db
    .from('user_events')
    .select('user_agent, distinct_id')
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .not('user_agent', 'is', null)
    .limit(10_000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!f.includeBots) q = (q as any).eq('bot_likely', false)
  q = applyFilters(q, f)
  const { data } = await q

  const browserAcc = new Map<string, { visitors: Set<string>; events: number }>()
  const osAcc = new Map<string, { visitors: Set<string>; events: number }>()
  for (const r of (data ?? []) as Row[]) {
    const b = browserOf(r.user_agent)
    const o = osOf(r.user_agent)
    if (!browserAcc.has(b)) browserAcc.set(b, { visitors: new Set(), events: 0 })
    if (!osAcc.has(o)) osAcc.set(o, { visitors: new Set(), events: 0 })
    browserAcc.get(b)!.visitors.add(r.distinct_id)
    browserAcc.get(b)!.events += 1
    osAcc.get(o)!.visitors.add(r.distinct_id)
    osAcc.get(o)!.events += 1
  }
  return {
    browsers: Array.from(browserAcc.entries())
      .map(([browser, v]) => ({ browser, visitors: v.visitors.size, events: v.events }))
      .sort((a, b) => b.visitors - a.visitors || a.browser.localeCompare(b.browser)),
    oses: Array.from(osAcc.entries())
      .map(([os, v]) => ({ os, visitors: v.visitors.size, events: v.events }))
      .sort((a, b) => b.visitors - a.visitors || a.os.localeCompare(b.os)),
  }
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await resolveServerFilters(sp)

  const [devices, { browsers, oses }, countryOptions] = await Promise.all([
    getDevices(filters),
    getBrowsersAndOs(filters),
    getCountryFilterOptions(),
  ])

  const totalServer = devices.reduce((s, r) => s + r.server_events, 0)
  const totalClient = devices.reduce((s, r) => s + r.client_events, 0)
  const totalVisitors = devices.reduce((s, r) => s + r.visitors, 0)
  // Directional ad-block proxy: server-event share of all events — a high
  // share suggests client trackers being stripped. Inference, not a count.
  const adBlockHint = totalClient > 0 ? (totalServer / (totalClient + totalServer)) * 100 : 0
  const mobilePct = devices.find((d) => d.device_type === 'mobile')?.pct_of_total ?? 0
  const desktopPct = devices.find((d) => d.device_type === 'desktop')?.pct_of_total ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <MonitorSmartphone className="h-5 w-5 text-emerald-500" />
            Devices
          </h1>
        </div>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Visitors" value={totalVisitors} info={<MetricInfo docKey="devices_breakdown" />} />
        <MetricCard label="Mobile share" value={Math.round(mobilePct * 10) / 10} suffix="%" />
        <MetricCard label="Desktop share" value={Math.round(desktopPct * 10) / 10} suffix="%" />
        <MetricCard
          label="Ad-block signal"
          value={Math.round(adBlockHint * 10) / 10}
          suffix="%"
          info={<MetricInfo docKey="devices_adblock" />}
          extra={<span className="text-[10px] text-zinc-600">server-event share — higher = more blocking</span>}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <BarList
          title="Device type · visitors"
          rows={devices.map((d) => ({ label: `${d.device_type} · ${d.pct_of_total}% of events`, value: d.visitors }))}
          emptyHint="No device data in window"
          info={<MetricInfo docKey="devices_breakdown" />}
        />
        <BarList
          title="Browser · visitors"
          rows={browsers.map((b) => ({ label: b.browser, value: b.visitors }))}
          emptyHint="No user-agent data in window"
          info={<MetricInfo docKey="devices_browser_os" />}
        />
        <BarList
          title="OS · visitors"
          rows={oses.map((o) => ({ label: o.os, value: o.visitors }))}
          emptyHint="No user-agent data in window"
          info={<MetricInfo docKey="devices_browser_os" />}
        />
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-1">
          <div className="text-sm font-medium text-zinc-300">
            Client vs server event mix per device · high server share = heavy ad-block in that bucket
          </div>
          <MetricInfo docKey="devices_adblock" />
        </div>
        {devices.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">No device data in window</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-2 py-2 text-left font-medium">Device</th>
                  <th className="px-2 py-2 text-right font-medium">Visitors</th>
                  <th className="px-2 py-2 text-right font-medium">Events</th>
                  <th className="px-2 py-2 text-right font-medium">Client</th>
                  <th className="px-2 py-2 text-right font-medium">Server</th>
                  <th className="px-2 py-2 text-right font-medium">Server share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {devices.map((d) => {
                  const serverShare = d.events > 0 ? (d.server_events / d.events) * 100 : 0
                  return (
                    <tr key={d.device_type} className="hover:bg-zinc-900/40">
                      <td className="px-2 py-2 capitalize text-zinc-200">{d.device_type}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{fmt(d.visitors)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{fmt(d.events)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-400">{fmt(d.client_events)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-400">{fmt(d.server_events)}</td>
                      <td className={`px-2 py-2 text-right font-mono tabular-nums ${serverShare > 30 ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {serverShare.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-zinc-500">
          Note: ad-blockers strip client events but server-mirrored revenue events still fire. A bucket with high
          server share is likely seeing more blocking. Don&apos;t read this as exact — it&apos;s a directional signal.
        </p>
      </div>
    </div>
  )
}
