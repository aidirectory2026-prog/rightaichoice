import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Eye, MousePointerClick, Bookmark, ArrowLeft, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Tool Stats' }

type Props = { params: Promise<{ id: string }> }

async function getToolStats(id: string) {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const [
    toolRes,
    viewsAllRes,
    views30dRes,
    clicksAllRes,
    clicks30dRes,
    savesRes,
    affiliateClicksRes,
  ] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, view_count, review_count, avg_rating, is_sponsored, affiliate_url, created_at')
      .eq('id', id)
      .single(),
    supabase.from('page_views').select('id', { count: 'exact', head: true }).eq('tool_id', id),
    supabase.from('page_views').select('id', { count: 'exact', head: true }).eq('tool_id', id).gte('created_at', cutoff),
    supabase.from('click_logs').select('id', { count: 'exact', head: true }).eq('tool_id', id),
    supabase.from('click_logs').select('id', { count: 'exact', head: true }).eq('tool_id', id).gte('created_at', cutoff),
    supabase.from('user_saved_tools').select('id', { count: 'exact', head: true }).eq('tool_id', id),
    supabase.from('click_logs').select('id', { count: 'exact', head: true })
      .eq('tool_id', id)
      .eq('source', 'affiliate_redirect'),
  ])

  return {
    tool: toolRes.data,
    viewsAll: viewsAllRes.count ?? 0,
    views30d: views30dRes.count ?? 0,
    clicksAll: clicksAllRes.count ?? 0,
    clicks30d: clicks30dRes.count ?? 0,
    saves: savesRes.count ?? 0,
    affiliateClicks: affiliateClicksRes.count ?? 0,
  }
}

export default async function ToolStatsPage({ params }: Props) {
  const { id } = await params
  const stats = await getToolStats(id)

  if (!stats.tool) notFound()

  const { tool } = stats
  const ctr = stats.viewsAll > 0 ? ((stats.clicksAll / stats.viewsAll) * 100).toFixed(1) : '0.0'

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/tools"
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{tool.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500">/{tool.slug}</span>
            {tool.is_sponsored && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-950 border border-blue-800 px-1.5 py-0.5 rounded">
                Sponsored
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Total Views"
          value={stats.viewsAll}
          color="emerald"
        />
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Views (30d)"
          value={stats.views30d}
          color="blue"
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Total Clicks"
          value={stats.clicksAll}
          color="amber"
        />
        <StatCard
          icon={<Bookmark className="h-4 w-4" />}
          label="Total Saves"
          value={stats.saves}
          color="purple"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500 mb-1">Click-through Rate</p>
          <p className="text-2xl font-bold text-white">{ctr}%</p>
          <p className="text-xs text-zinc-600 mt-1">clicks / views (all time)</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500 mb-1">Clicks (30d)</p>
          <p className="text-2xl font-bold text-white">{stats.clicks30d.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 mt-1">last 30 days</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500 mb-1">Affiliate Clicks</p>
          <p className="text-2xl font-bold text-white">{stats.affiliateClicks.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {tool.affiliate_url ? 'tracked via affiliate link' : 'no affiliate URL set'}
          </p>
        </div>
      </div>

      {/* Tool metadata */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Tool Metadata
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Avg Rating</dt>
            <dd className="text-white font-medium mt-0.5">
              {Number(tool.avg_rating) > 0 ? Number(tool.avg_rating).toFixed(1) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Reviews</dt>
            <dd className="text-white font-medium mt-0.5">{tool.review_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">View Count (DB)</dt>
            <dd className="text-white font-medium mt-0.5">{tool.view_count?.toLocaleString() ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Created</dt>
            <dd className="text-white font-medium mt-0.5">
              {new Date(tool.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </dd>
          </div>
        </dl>
        {tool.affiliate_url && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <dt className="text-xs text-zinc-500 mb-1">Affiliate URL</dt>
            <dd className="text-xs text-zinc-400 font-mono truncate">{tool.affiliate_url}</dd>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/admin/tools/${id}`}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Edit tool
        </Link>
        <span className="text-zinc-700">·</span>
        <Link
          href={`/tools/${tool.slug}`}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
          target="_blank"
        >
          View live page
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'emerald' | 'blue' | 'amber' | 'purple'
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
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
