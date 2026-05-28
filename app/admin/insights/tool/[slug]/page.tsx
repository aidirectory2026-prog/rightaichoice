// Phase 8.g.7 — per-tool audience snapshot.
// Phase 8.g.8 — bot filter propagated from caller.

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { type DayWindow, getToolAudienceDetail } from '../../queries'
import { parseRange } from '@/lib/admin/range'
import { BarList, MetricCard } from '../../charts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WINDOWS: { value: DayWindow; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

export default async function ToolAudiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; include_bots?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const requested = Number(sp.days ?? '30') as DayWindow
  const days: DayWindow = ([7, 30, 90] as DayWindow[]).includes(requested) ? requested : 30
  const includeBots = sp.include_bots === '1'

  const detail = await getToolAudienceDetail(slug, parseRange({ days: String(days) }), includeBots)
  const qs = (d: DayWindow) => `?days=${d}${includeBots ? '&include_bots=1' : ''}`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/insights${qs(days)}`}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Insights
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">
            Tool audience · <span className="text-emerald-400">{slug}</span>
          </h1>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.value}
              href={`/admin/insights/tool/${encodeURIComponent(slug)}${qs(w.value)}`}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                w.value === days
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                  : 'text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Vendor pitch in one screen: usage, intent-to-purchase signal, brand-adjacency.
        {includeBots ? ' Bots included.' : ' Bots excluded.'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Unique users" value={detail.unique_users} />
        <MetricCard label="Page views" value={detail.views} />
        <MetricCard label="Click-outs (affiliate)" value={detail.click_outs} />
        <MetricCard label="Saves" value={detail.saves} />
      </div>

      <div className="mt-6">
        <BarList
          title="Most-compared against this tool"
          rows={detail.compared_with}
          emptyHint="No comparisons including this tool yet"
          rowHrefBuilder={(s) => `/admin/insights/tool/${encodeURIComponent(s)}${qs(days)}`}
        />
      </div>

      <div className="mt-8 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-xs">
        <div className="mb-1 font-medium text-emerald-300">Vendor pitch snippet</div>
        <p className="text-zinc-300">
          In the last {days} days, <span className="font-mono text-emerald-200">{slug}</span> reached{' '}
          <span className="font-semibold text-white">{detail.unique_users.toLocaleString()}</span> unique high-intent
          users on RightAIChoice, with{' '}
          <span className="font-semibold text-white">{detail.views.toLocaleString()}</span> page views,{' '}
          <span className="font-semibold text-white">{detail.click_outs.toLocaleString()}</span> click-throughs to your
          site, and <span className="font-semibold text-white">{detail.saves.toLocaleString()}</span> bookmarks.
          {detail.compared_with.length > 0 && (
            <>
              {' '}Top alternatives users compare with you:{' '}
              <span className="text-zinc-400">{detail.compared_with.slice(0, 5).map((r) => r.label).join(', ')}</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
