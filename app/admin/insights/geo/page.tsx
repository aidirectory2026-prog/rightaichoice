import { getAdminClient } from '@/lib/cron/supabase-admin'
import { BigNumber, Card, EmptyState, countryFlag, fmt } from '../_ui/primitives'
import { RangePicker } from '@/components/admin/range-picker'
import { parseRange } from '@/lib/admin/range'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Geo · Insights' }

type GeoRow = {
  country: string
  visitors: number
  events: number
  top_city: string | null
  top_city_visitors: number | null
}

type ReferrerRow = { referrer_host: string; visitors: number; events: number }
type UtmRow = { utm_source: string; utm_medium: string | null; utm_campaign: string | null; visitors: number }

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', IN: 'India', DE: 'Germany', FR: 'France',
  ES: 'Spain', IT: 'Italy', NL: 'Netherlands', CA: 'Canada', AU: 'Australia',
  BR: 'Brazil', MX: 'Mexico', JP: 'Japan', CN: 'China', KR: 'South Korea',
  RU: 'Russia', UA: 'Ukraine', PL: 'Poland', SE: 'Sweden', NO: 'Norway',
  FI: 'Finland', DK: 'Denmark', IE: 'Ireland', BE: 'Belgium', AT: 'Austria',
  CH: 'Switzerland', PT: 'Portugal', GR: 'Greece', TR: 'Turkey', AE: 'UAE',
  SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan', TH: 'Thailand', VN: 'Vietnam',
  ID: 'Indonesia', PH: 'Philippines', MY: 'Malaysia', NZ: 'New Zealand', ZA: 'South Africa',
  NG: 'Nigeria', KE: 'Kenya', EG: 'Egypt', AR: 'Argentina', CL: 'Chile',
  CO: 'Colombia', PE: 'Peru', PK: 'Pakistan', BD: 'Bangladesh', IL: 'Israel',
  SA: 'Saudi Arabia', RO: 'Romania', CZ: 'Czechia', HU: 'Hungary', BG: 'Bulgaria',
}

async function getGeo(days: number): Promise<GeoRow[]> {
  const db = getAdminClient()
  const { data } = await db.rpc('insights_geo_breakdown' as never, {
    p_days: days,
    p_include_bots: false,
  } as never)
  return (data ?? []) as GeoRow[]
}

async function getReferrers(days: number): Promise<ReferrerRow[]> {
  const db = getAdminClient()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  type Row = { referrer: string | null; distinct_id: string }
  const { data } = await db
    .from('user_events')
    .select('referrer, distinct_id')
    .gte('created_at', cutoff)
    .eq('bot_likely', false)
    .eq('event_name', 'page_viewed')
    .limit(10_000)
  const acc = new Map<string, { visitors: Set<string>; events: number }>()
  for (const r of (data ?? []) as Row[]) {
    let host = '(direct)'
    if (r.referrer) {
      try { host = new URL(r.referrer).hostname.replace(/^www\./, '') } catch { host = r.referrer }
    }
    if (!acc.has(host)) acc.set(host, { visitors: new Set(), events: 0 })
    const entry = acc.get(host)!
    entry.visitors.add(r.distinct_id)
    entry.events += 1
  }
  return Array.from(acc.entries())
    .map(([referrer_host, v]) => ({ referrer_host, visitors: v.visitors.size, events: v.events }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 20)
}

async function getUtms(days: number): Promise<UtmRow[]> {
  const db = getAdminClient()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  type Row = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; distinct_id: string }
  const { data } = await db
    .from('user_events')
    .select('utm_source, utm_medium, utm_campaign, distinct_id')
    .gte('created_at', cutoff)
    .eq('bot_likely', false)
    .not('utm_source', 'is', null)
    .limit(5000)
  const acc = new Map<string, { row: UtmRow; visitors: Set<string> }>()
  for (const r of (data ?? []) as Row[]) {
    if (!r.utm_source) continue
    const key = `${r.utm_source}|${r.utm_medium ?? ''}|${r.utm_campaign ?? ''}`
    if (!acc.has(key)) {
      acc.set(key, {
        row: { utm_source: r.utm_source, utm_medium: r.utm_medium, utm_campaign: r.utm_campaign, visitors: 0 },
        visitors: new Set(),
      })
    }
    acc.get(key)!.visitors.add(r.distinct_id)
  }
  return Array.from(acc.values())
    .map((v) => ({ ...v.row, visitors: v.visitors.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 20)
}

export default async function GeoPage({ searchParams }: { searchParams: Promise<{ days?: string; range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams
  const sel = parseRange(sp)
  const days = sel.days

  const [geo, referrers, utms] = await Promise.all([
    getGeo(days),
    getReferrers(days),
    getUtms(days),
  ])

  const totalVisitors = geo.reduce((s, r) => s + r.visitors, 0)
  const maxVisitors = Math.max(...geo.map((r) => r.visitors), 1)
  const directVisitors = referrers.find((r) => r.referrer_host === '(direct)')?.visitors ?? 0
  const directPct = totalVisitors > 0 ? (directVisitors / totalVisitors) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Where visitors come from</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Country, city, referrer host, and UTM source.</p>
        </div>
        <RangePicker active={sel.key} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigNumber label="Countries reached" value={geo.length} />
        <BigNumber label="Total visitors" value={totalVisitors} />
        <BigNumber label="Top country" value={geo[0]?.country ?? '—'} hint={geo[0] ? `${fmt(geo[0].visitors)} visitors` : undefined} tone="accent" />
        <BigNumber label="Direct traffic" value={directPct.toFixed(0) + '%'} hint={`${fmt(directVisitors)} visitors`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Visitors by country" subtitle={`${geo.length} countries`}>
          {geo.length === 0 ? (
            <EmptyState title="No geo data in this window" />
          ) : (
            <ul className="space-y-1.5">
              {geo.map((r) => {
                const widthPct = (r.visitors / maxVisitors) * 100
                return (
                  <li key={r.country} className="relative overflow-hidden rounded">
                    <div className="absolute inset-y-0 left-0 bg-emerald-900/30" style={{ width: `${widthPct}%` }} />
                    <div className="relative flex items-center justify-between px-2 py-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none">{countryFlag(r.country)}</span>
                        <span className="text-zinc-200 font-medium">{COUNTRY_NAMES[r.country] ?? r.country}</span>
                        {r.top_city && (
                          <span className="text-[10px] text-zinc-500 truncate">· {r.top_city}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-zinc-500">{fmt(r.events)} ev</span>
                        <span className="font-mono text-zinc-200 tabular-nums">{fmt(r.visitors)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Top referrers" subtitle="Where they came from (host)">
          {referrers.length === 0 ? (
            <EmptyState title="No referrer data" />
          ) : (
            <ul className="space-y-1.5">
              {referrers.map((r) => {
                const widthPct = referrers[0] ? (r.visitors / referrers[0].visitors) * 100 : 0
                return (
                  <li key={r.referrer_host} className="relative overflow-hidden rounded">
                    <div className="absolute inset-y-0 left-0 bg-sky-900/30" style={{ width: `${widthPct}%` }} />
                    <div className="relative flex items-center justify-between px-2 py-1.5 text-xs">
                      <span className="text-zinc-200 truncate">{r.referrer_host}</span>
                      <span className="font-mono text-zinc-200 tabular-nums shrink-0 ml-2">{fmt(r.visitors)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="UTM campaigns" subtitle="Source · medium · campaign">
        {utms.length === 0 ? (
          <EmptyState title="No UTM-tagged traffic in window" hint="Tag outbound links with ?utm_source=… to see attribution here." />
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-left font-medium">Medium</th>
                  <th className="px-4 py-2 text-left font-medium">Campaign</th>
                  <th className="px-4 py-2 text-right font-medium">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {utms.map((u, i) => (
                  <tr key={i} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2 text-zinc-200">{u.utm_source}</td>
                    <td className="px-4 py-2 text-zinc-400">{u.utm_medium ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-400">{u.utm_campaign ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-zinc-200">{fmt(u.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
