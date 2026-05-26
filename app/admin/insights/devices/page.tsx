import { getAdminClient } from '@/lib/cron/supabase-admin'
import { BigNumber, Card, EmptyState, RangePicker, fmt, parseDays, pct } from '../_ui/primitives'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Devices · Insights' }

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

async function getDevices(days: number): Promise<DeviceRow[]> {
  const db = getAdminClient()
  const { data } = await db.rpc('insights_device_breakdown' as never, {
    p_days: days,
    p_include_bots: false,
  } as never)
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

async function getBrowsersAndOs(days: number): Promise<{ browsers: BrowserRow[]; oses: OsRow[] }> {
  const db = getAdminClient()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  type Row = { user_agent: string | null; distinct_id: string }
  const { data } = await db
    .from('user_events')
    .select('user_agent, distinct_id')
    .gte('created_at', cutoff)
    .eq('bot_likely', false)
    .not('user_agent', 'is', null)
    .limit(10_000)

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
      .sort((a, b) => b.visitors - a.visitors),
    oses: Array.from(osAcc.entries())
      .map(([os, v]) => ({ os, visitors: v.visitors.size, events: v.events }))
      .sort((a, b) => b.visitors - a.visitors),
  }
}

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams
  const days = parseDays(sp.days, 7)

  const [devices, { browsers, oses }] = await Promise.all([
    getDevices(days),
    getBrowsersAndOs(days),
  ])

  // Ad-block-rate estimate: per session, are we seeing server-only events?
  // Computed at the total level: ratio of (sessions w/ server only) / (sessions total).
  // Approximated here as server_events / total_events because we don't have
  // per-session aggregation at this layer.
  const totalServer = devices.reduce((s, r) => s + r.server_events, 0)
  const totalClient = devices.reduce((s, r) => s + r.client_events, 0)
  const totalVisitors = devices.reduce((s, r) => s + r.visitors, 0)
  // Naive ad-block rate: server-event share vs client. If a lot of revenue
  // events are server-only with no matching client_events, ad-blockers are
  // active. We expose this as informational, not a hard number.
  const adBlockHint = totalClient > 0 ? (totalServer / (totalClient + totalServer)) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Devices, browsers, ad-block</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Bucket counts from user_agent + Vercel device-type header.</p>
        </div>
        <RangePicker current={days} basePath="/admin/insights/devices" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigNumber label="Total visitors" value={totalVisitors} />
        <BigNumber
          label="Mobile share"
          value={pct(devices.find((d) => d.device_type === 'mobile')?.pct_of_total ?? 0)}
        />
        <BigNumber
          label="Desktop share"
          value={pct(devices.find((d) => d.device_type === 'desktop')?.pct_of_total ?? 0)}
          tone="accent"
        />
        <BigNumber
          label="Ad-block signal"
          value={pct(adBlockHint)}
          hint="Server-event share — higher = more blocking"
          tone={adBlockHint > 30 ? 'warn' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Device type" subtitle="From Vercel UA classification">
          <BarList rows={devices.map((d) => ({ label: d.device_type, value: d.visitors, sub: `${d.pct_of_total}%` }))} colour="emerald" />
        </Card>
        <Card title="Browser" subtitle="Heuristic from user_agent">
          <BarList rows={browsers.map((b) => ({ label: b.browser, value: b.visitors }))} colour="sky" />
        </Card>
        <Card title="OS" subtitle="Heuristic from user_agent">
          <BarList rows={oses.map((o) => ({ label: o.os, value: o.visitors }))} colour="violet" />
        </Card>
      </div>

      <Card title="Client vs server event mix per device" subtitle="High server share = heavy ad-block in that bucket">
        {devices.length === 0 ? (
          <EmptyState title="No device data in window" />
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left font-medium">Device</th>
                  <th className="px-4 py-2 text-right font-medium">Visitors</th>
                  <th className="px-4 py-2 text-right font-medium">Events</th>
                  <th className="px-4 py-2 text-right font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Server</th>
                  <th className="px-4 py-2 text-right font-medium">Server share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {devices.map((d) => {
                  const serverShare = d.events > 0 ? (d.server_events / d.events) * 100 : 0
                  return (
                    <tr key={d.device_type} className="hover:bg-zinc-900/30">
                      <td className="px-4 py-2 text-zinc-200">{d.device_type}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(d.visitors)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(d.events)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-zinc-400">{fmt(d.client_events)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-zinc-400">{fmt(d.server_events)}</td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${serverShare > 30 ? 'text-amber-400' : 'text-zinc-300'}`}>
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
          Note: ad-blockers strip client events but server-mirrored revenue events still fire. A bucket with high server share
          is likely seeing more blocking. Don&apos;t read this as exact — it&apos;s a directional signal.
        </p>
      </Card>
    </div>
  )
}

function BarList({
  rows, colour,
}: {
  rows: { label: string; value: number; sub?: string }[]
  colour: 'emerald' | 'sky' | 'violet'
}) {
  if (rows.length === 0) return <EmptyState title="No data" />
  const max = Math.max(...rows.map((r) => r.value), 1)
  const colourClass = {
    emerald: 'bg-emerald-900/40',
    sky: 'bg-sky-900/40',
    violet: 'bg-violet-900/40',
  }[colour]
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const widthPct = (r.value / max) * 100
        return (
          <li key={r.label} className="relative overflow-hidden rounded">
            <div className={`absolute inset-y-0 left-0 ${colourClass}`} style={{ width: `${widthPct}%` }} />
            <div className="relative flex items-center justify-between px-2 py-1.5 text-xs">
              <span className="text-zinc-200 capitalize">{r.label}</span>
              <span className="font-mono text-zinc-200 tabular-nums shrink-0 ml-2">
                {fmt(r.value)} {r.sub && <span className="text-[10px] text-zinc-500 ml-1">{r.sub}</span>}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
