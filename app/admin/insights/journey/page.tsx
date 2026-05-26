import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { Card, EmptyState, RangePicker, countryFlag, fmt, parseDays, relativeTime } from '../_ui/primitives'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Journeys · Insights' }

type RecentJourney = {
  distinct_id: string
  last_seen: string
  events: number
  pages_visited: number
  country: string | null
  city: string | null
  device_type: string | null
  entry_page: string | null
  exit_page: string | null
  auth_state: string
}

async function getRecentJourneys(days: number, q: string): Promise<RecentJourney[]> {
  const db = getAdminClient()
  // Aggregate per-distinct_id activity in window. Used purely for display, so
  // a fast scan over recent events is enough — no need to RPC.
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  type Row = {
    distinct_id: string
    created_at: string
    page_path: string | null
    country: string | null
    city: string | null
    device_type: string | null
    auth_state: string | null
  }
  let qb = db
    .from('user_events')
    .select('distinct_id, created_at, page_path, country, city, device_type, auth_state')
    .gte('created_at', cutoff)
    .eq('bot_likely', false)
    .order('created_at', { ascending: false })
    .limit(5000)
  if (q) qb = qb.ilike('distinct_id', `%${q}%`)
  const { data } = (await qb) as { data: Row[] | null }

  const map = new Map<string, RecentJourney>()
  for (const row of data ?? []) {
    const r = map.get(row.distinct_id)
    if (!r) {
      map.set(row.distinct_id, {
        distinct_id: row.distinct_id,
        last_seen: row.created_at,
        events: 1,
        pages_visited: row.page_path ? 1 : 0,
        country: row.country,
        city: row.city,
        device_type: row.device_type,
        entry_page: row.page_path,
        exit_page: row.page_path,
        auth_state: row.auth_state ?? 'anon',
      })
    } else {
      r.events += 1
      if (row.page_path) {
        r.pages_visited += 1
        r.entry_page = row.page_path
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
    .slice(0, 100)
}

export default async function JourneysIndex({ searchParams }: { searchParams: Promise<{ days?: string; q?: string }> }) {
  const sp = await searchParams
  const days = parseDays(sp.days, 7)
  const q = (sp.q ?? '').trim()
  const journeys = await getRecentJourneys(days, q)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">User journeys</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Click any user to see their full timeline, replay, and session map.</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search distinct_id…"
              className="rounded-md border border-zinc-800 bg-zinc-950 pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-emerald-700 focus:outline-none w-56"
            />
            <input type="hidden" name="days" value={days} />
          </form>
          <RangePicker current={days} basePath="/admin/insights/journey" />
        </div>
      </div>

      <Card title={`${journeys.length} unique visitors${q ? ` matching "${q}"` : ''}`}>
        {journeys.length === 0 ? (
          <EmptyState title="No journeys yet" hint="Visitors appear here as soon as events start landing." />
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left font-medium">Visitor</th>
                  <th className="px-4 py-2 text-left font-medium">Location</th>
                  <th className="px-4 py-2 text-left font-medium">Device</th>
                  <th className="px-4 py-2 text-right font-medium">Events</th>
                  <th className="px-4 py-2 text-right font-medium">Pages</th>
                  <th className="px-4 py-2 text-right font-medium">Last seen</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {journeys.map((j) => (
                  <tr key={j.distinct_id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2 font-mono text-zinc-300">
                      <Link href={`/admin/insights/journey/${encodeURIComponent(j.distinct_id)}`} className="hover:text-emerald-400">
                        {j.distinct_id.length > 24 ? j.distinct_id.slice(0, 24) + '…' : j.distinct_id}
                      </Link>
                      {j.auth_state === 'known' && <span className="ml-1.5 text-[10px] text-emerald-500">●</span>}
                    </td>
                    <td className="px-4 py-2 text-zinc-400">
                      <span className="mr-1">{countryFlag(j.country)}</span>
                      {[j.city, j.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{j.device_type ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">{fmt(j.events)}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">{fmt(j.pages_visited)}</td>
                    <td className="px-4 py-2 text-right text-zinc-500">{relativeTime(j.last_seen)}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/insights/journey/${encodeURIComponent(j.distinct_id)}`}
                        className="inline-flex items-center gap-0.5 text-zinc-500 hover:text-emerald-400"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
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
