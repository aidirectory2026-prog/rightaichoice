import { createClient } from '@/lib/supabase/server'
import { Eye, MousePointerClick, Search, Star, MessageSquare, GitBranch, TrendingUp, Users } from 'lucide-react'

export const metadata = { title: 'Analytics' }

async function getAnalyticsData() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const [
    totalViewsRes,
    recentViewsRes,
    totalClicksRes,
    topToolsRes,
    topSearchesRes,
    totalsRes,
  ] = await Promise.all([
    supabase.from('page_views').select('id', { count: 'exact', head: true }),
    supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', cutoff),
    supabase.from('click_logs').select('id', { count: 'exact', head: true }),
    supabase
      .from('tools')
      .select('id, name, slug, view_count, review_count, avg_rating')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(10),
    supabase
      .from('search_logs')
      .select('query')
      .gte('created_at', cutoff)
      .limit(500),
    Promise.all([
      supabase.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]),
  ])

  // Aggregate top search queries
  const searchCounts: Record<string, number> = {}
  ;(topSearchesRes.data ?? []).forEach(({ query }: { query: string }) => {
    if (!query) return
    const q = query.toLowerCase().trim()
    searchCounts[q] = (searchCounts[q] ?? 0) + 1
  })
  const topSearches = Object.entries(searchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }))

  const [toolsTotal, reviewsTotal, questionsTotal, workflowsTotal, usersTotal] = totalsRes

  return {
    totalViews: totalViewsRes.count ?? 0,
    recentViews: recentViewsRes.count ?? 0,
    totalClicks: totalClicksRes.count ?? 0,
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

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform-wide metrics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={data.counts.users} color="blue" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Tools" value={data.counts.tools} color="emerald" />
        <StatCard icon={<Star className="h-4 w-4" />} label="Reviews" value={data.counts.reviews} color="amber" />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Questions" value={data.counts.questions} color="purple" />
        <StatCard icon={<GitBranch className="h-4 w-4" />} label="Workflows" value={data.counts.workflows} color="cyan" />
      </div>

      {/* Traffic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <TrafficCard
          icon={<Eye className="h-5 w-5 text-zinc-400" />}
          label="Total Page Views"
          value={data.totalViews}
          sub="all time"
        />
        <TrafficCard
          icon={<Eye className="h-5 w-5 text-emerald-400" />}
          label="Page Views (30d)"
          value={data.recentViews}
          sub="last 30 days"
        />
        <TrafficCard
          icon={<MousePointerClick className="h-5 w-5 text-blue-400" />}
          label="Tool Click-throughs"
          value={data.totalClicks}
          sub="all time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top tools by views */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Top Tools by Views
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
            Top Search Queries (30d)
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
              <p className="text-xs text-zinc-600">No searches recorded yet.</p>
            )}
          </div>
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
