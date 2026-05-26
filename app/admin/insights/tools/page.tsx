import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Search } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { BigNumber, Card, EmptyState, RangePicker, fmt, parseDays, relativeTime } from '../_ui/primitives'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Tools heatmap · Insights' }

type ToolStat = {
  tool_slug: string
  tool_name: string | null
  views: number
  unique_visitors: number
  visit_clicks: number
  ctr_pct: number
  last_visit_at: string
}

async function getHeatmap(days: number, q: string): Promise<ToolStat[]> {
  const db = getAdminClient()
  const { data } = await db.rpc('insights_tool_heatmap' as never, {
    p_days: days,
    p_include_bots: false,
    p_limit: 500,
  } as never)
  let rows = (data ?? []) as ToolStat[]
  if (q) {
    const qLower = q.toLowerCase()
    rows = rows.filter(
      (r) => r.tool_slug.toLowerCase().includes(qLower) || (r.tool_name?.toLowerCase().includes(qLower) ?? false),
    )
  }
  return rows
}

// Heat colour for CTR cell — green at high CTR, amber mid, red low.
function ctrCellClass(ctr: number, hasClicks: boolean): string {
  if (!hasClicks) return 'text-zinc-600'
  if (ctr >= 10) return 'bg-emerald-900/50 text-emerald-300'
  if (ctr >= 3) return 'bg-amber-900/40 text-amber-300'
  return 'bg-rose-900/30 text-rose-300'
}

function viewsBgClass(views: number, max: number): string {
  if (max === 0) return ''
  const ratio = views / max
  if (ratio > 0.75) return 'bg-emerald-900/40'
  if (ratio > 0.5) return 'bg-emerald-900/30'
  if (ratio > 0.25) return 'bg-emerald-900/20'
  if (ratio > 0.1) return 'bg-emerald-900/10'
  return ''
}

export default async function ToolsHeatmap({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; q?: string }>
}) {
  const sp = await searchParams
  const days = parseDays(sp.days, 7)
  const q = (sp.q ?? '').trim()
  const rows = await getHeatmap(days, q)

  const totalViews = rows.reduce((s, r) => s + r.views, 0)
  const totalClicks = rows.reduce((s, r) => s + r.visit_clicks, 0)
  const totalVisitors = rows.reduce((s, r) => s + r.unique_visitors, 0)
  const overallCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0
  const maxViews = Math.max(...rows.map((r) => r.views), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Tool heatmap</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Views, visitors, click-through. Click a tool to drill into its journeys.</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search tools…"
              className="rounded-md border border-zinc-800 bg-zinc-950 pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-emerald-700 focus:outline-none w-56"
            />
            <input type="hidden" name="days" value={days} />
          </form>
          <RangePicker current={days} basePath="/admin/insights/tools" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigNumber label="Tools with traffic" value={rows.length} hint="In selected window" />
        <BigNumber label="Total views" value={totalViews} />
        <BigNumber label="Unique visitors" value={totalVisitors} />
        <BigNumber
          label="Overall CTR"
          value={overallCtr.toFixed(1) + '%'}
          tone={overallCtr >= 5 ? 'good' : overallCtr >= 1 ? 'warn' : 'bad'}
        />
      </div>

      <Card title={`${rows.length} tools${q ? ` matching "${q}"` : ''}`}>
        {rows.length === 0 ? (
          <EmptyState title="No tool traffic in this window" hint="Try a wider date range or check that tool_page_viewed is firing." />
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left font-medium">Tool</th>
                  <th className="px-4 py-2 text-right font-medium">Views</th>
                  <th className="px-4 py-2 text-right font-medium">Visitors</th>
                  <th className="px-4 py-2 text-right font-medium">Clicks</th>
                  <th className="px-4 py-2 text-right font-medium">CTR</th>
                  <th className="px-4 py-2 text-right font-medium">Last visit</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {rows.map((r) => (
                  <tr key={r.tool_slug} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/insights/tool/${encodeURIComponent(r.tool_slug)}?days=${days}`}
                        className="text-zinc-200 hover:text-emerald-400 font-medium"
                      >
                        {r.tool_name ?? r.tool_slug}
                      </Link>
                      <div className="text-[10px] text-zinc-600 font-mono">{r.tool_slug}</div>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${viewsBgClass(r.views, maxViews)}`}>
                      {fmt(r.views)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-400 tabular-nums">{fmt(r.unique_visitors)}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-400 tabular-nums">{fmt(r.visit_clicks)}</td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums rounded-l-sm ${ctrCellClass(r.ctr_pct, r.visit_clicks > 0)}`}>
                      {r.ctr_pct}%
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">{relativeTime(r.last_visit_at)}</td>
                    <td className="px-4 py-2 flex items-center gap-1">
                      <Link
                        href={`/tools/${r.tool_slug}`}
                        target="_blank"
                        className="text-zinc-500 hover:text-zinc-300"
                        title="Open live tool page"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/admin/insights/tool/${encodeURIComponent(r.tool_slug)}?days=${days}`}
                        className="text-zinc-500 hover:text-emerald-400"
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
