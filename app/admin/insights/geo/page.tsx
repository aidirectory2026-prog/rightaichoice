// Phase 10.5a.4 (2026-06-12) — Geography re-skinned onto the Phase-4 shell:
// global FilterBar (full capability set, URL state), chart-kit cards, and
// ⓘ provenance popovers. AdminFilters threaded through every query — the
// breakdown RPC takes p_filters (shared predicate, migration 156); the
// referrer/UTM selects use the applyFilters() PostgREST mirror — i.e. the
// two paths the filter-matrix verifier proves against raw SQL.

import Link from 'next/link'
import { ChevronLeft, Globe2 } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { BarList, MetricCard, fmt } from '@/components/admin/charts'
import { applyFilters, filtersToJsonb, parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { countryFlag } from '../_ui/primitives'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Geography — Admin' }

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

async function getGeo(f: AdminFilters): Promise<GeoRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_geo_breakdown', {
    p_days: f.range.days,
    p_include_bots: f.includeBots,
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return (data ?? []) as GeoRow[]
}

async function getReferrers(f: AdminFilters): Promise<ReferrerRow[]> {
  const db = getAdminClient()
  type Row = { referrer: string | null; distinct_id: string }
  let q = db
    .from('user_events')
    .select('referrer, distinct_id')
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .eq('event_name', 'page_viewed')
    .limit(10_000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!f.includeBots) q = (q as any).eq('bot_likely', false)
  // page_viewed-pinned panel: a global event filter would AND with the pin
  // and zero the card, so it is dropped (same convention as the dashboard).
  q = applyFilters(q, f, { dropEvent: true })
  const { data } = await q
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
    .sort((a, b) => b.visitors - a.visitors || a.referrer_host.localeCompare(b.referrer_host))
    .slice(0, 20)
}

async function getUtms(f: AdminFilters): Promise<UtmRow[]> {
  const db = getAdminClient()
  type Row = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; distinct_id: string }
  let q = db
    .from('user_events')
    .select('utm_source, utm_medium, utm_campaign, distinct_id')
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .not('utm_source', 'is', null)
    .limit(5000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!f.includeBots) q = (q as any).eq('bot_likely', false)
  q = applyFilters(q, f)
  const { data } = await q
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
    .sort((a, b) => b.visitors - a.visitors || a.utm_source.localeCompare(b.utm_source))
    .slice(0, 20)
}

export default async function GeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAdminFilters(sp)

  const [geo, referrers, utms, countryOptions] = await Promise.all([
    getGeo(filters),
    getReferrers(filters),
    getUtms(filters),
    getCountryFilterOptions(),
  ])

  const totalVisitors = geo.reduce((s, r) => s + r.visitors, 0)
  const maxVisitors = Math.max(...geo.map((r) => r.visitors), 1)
  const directVisitors = referrers.find((r) => r.referrer_host === '(direct)')?.visitors ?? 0
  const directPct = totalVisitors > 0 ? (directVisitors / totalVisitors) * 100 : 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Globe2 className="h-5 w-5 text-emerald-500" />
            Geography
          </h1>
        </div>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Countries reached" value={geo.length} />
        <MetricCard label="Visitors (with geo)" value={totalVisitors} info={<MetricInfo docKey="geo_countries" />} />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Top country</div>
          <div className="mt-2 text-2xl font-semibold text-sky-300">
            {geo[0] ? `${countryFlag(geo[0].country)} ${geo[0].country}` : '—'}
          </div>
          {geo[0] ? (
            <div className="mt-1 text-[11px] text-zinc-500">{fmt(geo[0].visitors)} visitors</div>
          ) : null}
        </div>
        <MetricCard
          label="Direct traffic"
          value={Math.round(directPct)}
          suffix="%"
          extra={<span className="text-[10px] text-zinc-600">{fmt(directVisitors)} visitors with no referrer</span>}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-1">
            <div className="text-sm font-medium text-zinc-300">Visitors by country · {geo.length} countries</div>
            <MetricInfo docKey="geo_countries" />
          </div>
          {geo.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">No geo data in selected window</div>
          ) : (
            <ul className="space-y-1.5">
              {geo.map((r) => {
                const widthPct = (r.visitors / maxVisitors) * 100
                return (
                  <li key={r.country} className="relative overflow-hidden rounded bg-zinc-950">
                    <div className="absolute inset-y-0 left-0 bg-emerald-900/40" style={{ width: `${widthPct}%` }} aria-hidden />
                    <div className="relative z-10 flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-base leading-none">{countryFlag(r.country)}</span>
                        <span className="font-medium text-zinc-200">{COUNTRY_NAMES[r.country] ?? r.country}</span>
                        {r.top_city && (
                          <span className="truncate text-[10px] text-zinc-500">· {r.top_city}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[10px] text-zinc-500">{fmt(r.events)} ev</span>
                        <span className="font-mono tabular-nums text-zinc-400">{fmt(r.visitors)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <BarList
          title="Top referrers · last-touch · visitors"
          rows={referrers.map((r) => ({ label: r.referrer_host, value: r.visitors }))}
          emptyHint="No referrer data (attribution capture began 2026-06-10)"
          info={<MetricInfo docKey="geo_referrers" />}
        />
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-1">
          <div className="text-sm font-medium text-zinc-300">UTM campaigns · source / medium / campaign</div>
          <MetricInfo docKey="geo_utm" />
        </div>
        {utms.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            No UTM-tagged traffic in window — tag outbound links with ?utm_source=… to see attribution here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-2 py-2 text-left font-medium">Source</th>
                  <th className="px-2 py-2 text-left font-medium">Medium</th>
                  <th className="px-2 py-2 text-left font-medium">Campaign</th>
                  <th className="px-2 py-2 text-right font-medium">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {utms.map((u, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40">
                    <td className="px-2 py-2 text-zinc-200">{u.utm_source}</td>
                    <td className="px-2 py-2 text-zinc-400">{u.utm_medium ?? '—'}</td>
                    <td className="px-2 py-2 text-zinc-400">{u.utm_campaign ?? '—'}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-200">{fmt(u.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
