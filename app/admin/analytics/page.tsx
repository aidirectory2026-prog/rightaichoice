import { createClient } from '@/lib/supabase/server'
import { Eye, MousePointerClick, Search, Star, MessageSquare, GitBranch, TrendingUp, Users } from 'lucide-react'
import { RangePicker } from '@/components/admin/range-picker'
import { parseRange, type RangeSelection } from '@/lib/admin/range'
import { getAdminClient } from '@/lib/cron/supabase-admin'

// Phase 8.d.6 — force-dynamic + shared range picker. No more 30-day cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Analytics' }

async function getAnalyticsData(sel: RangeSelection) {
  const supabase = await createClient()
  const cutoff = sel.cutoffISO
  const end = sel.endCutoffISO

  const [
    totalViewsRes,
    recentViewsRes,
    totalClicksRes,
    recentClicksRes,
    topToolsRes,
    topSearchesRes,
    totalsRes,
  ] = await Promise.all([
    supabase.from('page_views').select('id', { count: 'exact', head: true }),
    supabase.from('page_views').select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff).lt('created_at', end),
    supabase.from('click_logs').select('id', { count: 'exact', head: true }),
    supabase.from('click_logs').select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff).lt('created_at', end),
    supabase
      .from('tools')
      .select('id, name, slug, view_count, review_count, avg_rating')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(10),
    // Aggregated in-DB via service-role RPC (search_top_queries is locked to
    // service_role), replacing the prior 500-row fetch + JS tally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getAdminClient() as any).rpc('search_top_queries',
      { p_cutoff: cutoff, p_end: end, p_limit: 10, p_days: sel.days }),
    Promise.all([
      supabase.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]),
  ])

  const topSearches = ((topSearchesRes.data as Array<{ query: string; count: number }>) ?? [])
    .map((r) => ({ query: r.query, count: Number(r.count) }))

  const [toolsTotal, reviewsTotal, questionsTotal, workflowsTotal, usersTotal] = totalsRes

  // Dept B (fable 5 review) — affiliate enrollment to-do list: tools earning
  // real human outbound clicks with no affiliate_url configured. Every row
  // here is revenue the site sends out for free. Volume is small enough to
  // tally in JS (windowed human visit events, capped at 5k rows).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { data: visitEvents } = await admin
    .from('user_events')
    .select('properties')
    .eq('event_name', 'tool_visit_redirected')
    .eq('bot_likely', false)
    .gte('created_at', cutoff)
    .lt('created_at', end)
    .limit(5000)
  const clicksBySlug = new Map<string, number>()
  for (const row of (visitEvents ?? []) as Array<{ properties: { tool_slug?: unknown } | null }>) {
    const s = row.properties?.tool_slug
    if (typeof s === 'string' && s) clicksBySlug.set(s, (clicksBySlug.get(s) ?? 0) + 1)
  }
  let affiliateGaps: Array<{ slug: string; name: string; clicks: number }> = []
  if (clicksBySlug.size > 0) {
    const { data: gapTools } = await admin
      .from('tools')
      .select('slug, name')
      .in('slug', [...clicksBySlug.keys()].slice(0, 200))
      .is('affiliate_url', null)
      .eq('is_published', true)
    affiliateGaps = ((gapTools ?? []) as Array<{ slug: string; name: string }>)
      .map((t) => ({ slug: t.slug, name: t.name, clicks: clicksBySlug.get(t.slug) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50)
  }

  return {
    affiliateGaps,
    totalViews: totalViewsRes.count ?? 0,
    recentViews: recentViewsRes.count ?? 0,
    totalClicks: totalClicksRes.count ?? 0,
    recentClicks: recentClicksRes.count ?? 0,
    topTools: topToolsRes.data ?? [],
    topSearches,
    counts: {
      tools: toolsTotal.count ?? 0,
      reviews: reviewsTotal.count ?? 0,
      questions: questionsTotal.count ?? 0,
      workflows: workflowsTotal.count ?? 0,
      users: usersTotal.count ?? 0,
    },
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const sel = parseRange(sp)
  const data = await getAnalyticsData(sel)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Platform-wide metrics · window: {sel.label}</p>
        </div>
        <RangePicker active={sel.key} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={data.counts.users} color="blue" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Tools" value={data.counts.tools} color="emerald" />
        <StatCard icon={<Star className="h-4 w-4" />} label="Reviews" value={data.counts.reviews} color="amber" />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Questions" value={data.counts.questions} color="purple" />
        <StatCard icon={<GitBranch className="h-4 w-4" />} label="Workflows" value={data.counts.workflows} color="cyan" />
      </div>

      {/* Traffic cards — all 3 windowed */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <TrafficCard
          icon={<Eye className="h-5 w-5 text-zinc-400" />}
          label="Total Page Views"
          value={data.totalViews}
          sub="all time"
        />
        <TrafficCard
          icon={<Eye className="h-5 w-5 text-emerald-400" />}
          label={`Page Views · ${sel.label}`}
          value={data.recentViews}
          sub={sel.label.toLowerCase()}
        />
        <TrafficCard
          icon={<MousePointerClick className="h-5 w-5 text-blue-400" />}
          label={`Clicks · ${sel.label}`}
          value={data.recentClicks}
          sub={sel.label.toLowerCase()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top tools by views */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Top Tools by Views (all time)
          </h2>
          <div className="space-y-2">
            {data.topTools.map((tool: { id: string; name: string; slug: string; view_count: number; review_count: number; avg_rating: number }, i) => (
              <div key={tool.id} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs text-zinc-600 font-mono">{i + 1}</span>
                <a
                  href={`/tools/${tool.slug}`}
                  className="flex-1 min-w-0 text-sm text-zinc-300 hover:text-white truncate transition-colors"
                >
                  {tool.name}
                </a>
                <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {tool.view_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {tool.avg_rating > 0 ? Number(tool.avg_rating).toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            ))}
            {data.topTools.length === 0 && (
              <p className="text-xs text-zinc-600">No data yet.</p>
            )}
          </div>
        </div>

        {/* Top searches */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-400" />
            Top Search Queries · {sel.label}
          </h2>
          <div className="space-y-2">
            {data.topSearches.map(({ query, count }, i) => {
              const max = data.topSearches[0]?.count ?? 1
              const pct = Math.round((count / max) * 100)
              return (
                <div key={query} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-zinc-600 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-zinc-300 truncate">{query}</span>
                      <span className="text-xs text-zinc-500 ml-2 shrink-0">{count}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
            {data.topSearches.length === 0 && (
              <p className="text-xs text-zinc-600">No searches recorded in this window.</p>
            )}
          </div>
        </div>
      </div>

      {/* Affiliate gaps — Dept B (fable 5 review). Human outbound clicks the
          site is sending out with no affiliate program attached: the
          founder's enrollment to-do list, highest-clicked first. */}
      <div className="mt-6 rounded-xl border border-amber-900/40 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-amber-400" />
          Affiliate gaps · {sel.label}
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Tools real humans clicked out to that have <span className="text-amber-400">no affiliate_url</span> set
          — each row is unmonetized outbound traffic. Enroll in these programs first.
        </p>
        <div className="space-y-2">
          {data.affiliateGaps.map((t, i) => (
            <div key={t.slug} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs text-zinc-600 font-mono">{i + 1}</span>
              <a
                href={`/tools/${t.slug}`}
                className="flex-1 min-w-0 text-sm text-zinc-300 hover:text-white truncate transition-colors"
              >
                {t.name}
              </a>
              <span className="text-xs text-zinc-500 shrink-0">
                {t.clicks} human click{t.clicks === 1 ? '' : 's'}
              </span>
            </div>
          ))}
          {data.affiliateGaps.length === 0 && (
            <p className="text-xs text-zinc-600">
              No unmonetized outbound clicks in this window — either every clicked tool has an
              affiliate_url, or there were no human outbound clicks yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'cyan'
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${colors[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  )
}

function TrafficCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-zinc-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-600 mt-1">{sub}</div>
    </div>
  )
}
