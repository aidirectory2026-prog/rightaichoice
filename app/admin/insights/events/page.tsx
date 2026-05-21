// Phase 8.g.8 (2026-05-21) — raw event viewer at /admin/insights/events.
//
// What the aggregate dashboard can't answer: "show me the actual event
// rows" / "what was the exact payload" / "what did distinct_id X do."
// This page paginates user_events with event_name + distinct_id filters,
// click any row to expand its JSON properties.

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { type DayWindow, getDistinctEventNames, getRawEvents, type RawEventRow } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Raw events — Admin' }

const PAGE_SIZE = 50

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDevice(d: string | null): string {
  if (!d) return '—'
  if (d === 'mobile') return '📱'
  if (d === 'tablet') return '📲'
  if (d === 'desktop') return '🖥'
  return d
}

export default async function RawEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string
    include_bots?: string
    event_name?: string
    distinct_id?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const requested = Number(sp.days ?? '7') as DayWindow
  const days: DayWindow = ([1, 7, 30, 90] as DayWindow[]).includes(requested) ? requested : 7
  const includeBots = sp.include_bots === '1'
  const eventName = sp.event_name || undefined
  const distinctId = sp.distinct_id || undefined
  const page = Math.max(0, Number(sp.page ?? '0'))

  const [{ rows, total }, eventNames] = await Promise.all([
    getRawEvents({ days, includeBots, eventName, distinctId, page, pageSize: PAGE_SIZE }),
    getDistinctEventNames(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const buildQs = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {
      days: String(days),
      ...(includeBots ? { include_bots: '1' } : {}),
      ...(eventName ? { event_name: eventName } : {}),
      ...(distinctId ? { distinct_id: distinctId } : {}),
      page: String(page),
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') delete merged[k]
      else merged[k] = v
    }
    const qs = new URLSearchParams(merged).toString()
    return qs ? `?${qs}` : ''
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/insights?days=${days}${includeBots ? '&include_bots=1' : ''}`}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ChevronLeft className="h-3 w-3" />
            Insights
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">Raw events</h1>
        </div>
        <div className="text-xs text-zinc-500">
          {total.toLocaleString()} rows in last {days}d
          {!includeBots && ' (bots excluded)'}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <form className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 lg:grid-cols-5">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500">Event name</label>
          <select
            name="event_name"
            defaultValue={eventName ?? ''}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
          >
            <option value="">All events</option>
            {eventNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500">Distinct ID</label>
          <input
            name="distinct_id"
            defaultValue={distinctId ?? ''}
            placeholder="paste a distinct_id (eg $device:abc-123…)"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500">Window</label>
          <select
            name="days"
            defaultValue={String(days)}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
          >
            <option value="1">last 24h</option>
            <option value="7">last 7d</option>
            <option value="30">last 30d</option>
            <option value="90">last 90d</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-300">
            <input
              type="checkbox"
              name="include_bots"
              value="1"
              defaultChecked={includeBots}
              className="rounded border-zinc-700 bg-zinc-950"
            />
            Include bots
          </label>
          <button
            type="submit"
            className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
          >
            Filter
          </button>
        </div>
      </form>

      {/* ── Events table ───────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">distinct_id</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Auth</th>
              <th className="px-3 py-2">Src</th>
              <th className="px-3 py-2">Bot</th>
              <th className="px-3 py-2">Properties</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                  No events match the filters.
                </td>
              </tr>
            )}
            {rows.map((r: RawEventRow) => (
              <tr key={r.id} className="border-b border-zinc-900 hover:bg-zinc-900/30">
                <td className="px-3 py-2 align-top whitespace-nowrap text-zinc-400" title={r.created_at}>
                  {fmtAgo(r.created_at)}
                </td>
                <td className="px-3 py-2 align-top font-mono text-emerald-300">{r.event_name}</td>
                <td className="px-3 py-2 align-top">
                  <Link
                    href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`}
                    className="font-mono text-zinc-400 hover:text-emerald-400"
                    title={r.distinct_id}
                  >
                    {r.distinct_id.length > 24 ? r.distinct_id.slice(0, 24) + '…' : r.distinct_id}
                  </Link>
                </td>
                <td className="px-3 py-2 align-top text-zinc-400 max-w-[200px] truncate" title={r.page_path ?? ''}>
                  {r.page_path ?? '—'}
                </td>
                <td className="px-3 py-2 align-top text-center">{fmtDevice(r.device_type)}</td>
                <td className="px-3 py-2 align-top text-zinc-400">{r.auth_state ?? '—'}</td>
                <td className="px-3 py-2 align-top text-zinc-500">{r.source_kind}</td>
                <td className="px-3 py-2 align-top text-center">
                  {r.bot_likely ? <span className="text-amber-400">🤖</span> : ''}
                </td>
                <td className="px-3 py-2 align-top max-w-[400px]">
                  <details>
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">
                      {Object.keys(r.properties ?? {}).length} keys
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-300">
                      {JSON.stringify(r.properties ?? {}, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 0 && (
              <Link
                href={`/admin/insights/events${buildQs({ page: String(page - 1) })}`}
                className="rounded border border-zinc-800 px-2.5 py-1 hover:text-zinc-200"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages - 1 && (
              <Link
                href={`/admin/insights/events${buildQs({ page: String(page + 1) })}`}
                className="rounded border border-zinc-800 px-2.5 py-1 hover:text-zinc-200"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
