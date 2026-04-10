import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolActions } from './tool-actions'

export const metadata = { title: 'Manage Tools' }

type SearchParams = Promise<{ filter?: string }>

export default async function AdminToolsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tools')
    .select('id, name, slug, pricing_type, is_published, is_featured, is_sponsored, avg_rating, review_count, view_count, created_at, last_verified_at, submitted_by')
    .order('created_at', { ascending: false })

  // Staleness filters
  if (filter === 'stale') {
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    query = query.eq('is_published', true).or(`last_verified_at.is.null,last_verified_at.lt.${cutoff90}`)
  } else if (filter === 'aging') {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    query = query.eq('is_published', true).lt('last_verified_at', cutoff30).gte('last_verified_at', cutoff90)
  } else if (filter === 'draft') {
    query = query.eq('is_published', false)
  }

  const { data: tools, error } = await query

  if (error) {
    return <p className="text-red-400">Failed to load tools: {error.message}</p>
  }

  // Fetch which submitters have the tool_creator badge
  const submitterIds = (tools ?? []).map(t => t.submitted_by).filter(Boolean) as string[]
  const badgeHolders = new Set<string>()
  if (submitterIds.length > 0) {
    const { data: badges } = await supabase
      .from('user_badges')
      .select('user_id')
      .in('user_id', submitterIds)
      .eq('badge', 'tool_creator')
    badges?.forEach(b => badgeHolders.add(b.user_id))
  }

  // Compute freshness stats from full list
  const total = tools?.length ?? 0
  const now = Date.now()
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const d90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()

  let freshCount = 0, agingCount = 0, staleCount = 0
  if (!filter) {
    for (const t of tools ?? []) {
      if (!t.is_published) continue
      if (!t.last_verified_at) { staleCount++; continue }
      if (t.last_verified_at >= d30) freshCount++
      else if (t.last_verified_at >= d90) agingCount++
      else staleCount++
    }
  }

  function freshnessLabel(lastVerified: string | null) {
    if (!lastVerified) return { text: 'Never', color: 'text-red-400' }
    if (lastVerified >= d30) return { text: 'Fresh', color: 'text-emerald-400' }
    if (lastVerified >= d90) return { text: 'Aging', color: 'text-amber-400' }
    return { text: 'Stale', color: 'text-red-400' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tools</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} tools{filter ? ` (${filter})` : ' in database'}</p>
        </div>
        <Link
          href="/admin/tools/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Tool
        </Link>
      </div>

      {/* Freshness stats (only on default view) */}
      {!filter && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Link href="/admin/tools" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors">
            <p className="text-xs text-zinc-500">Total Published</p>
            <p className="text-lg font-bold text-white">{freshCount + agingCount + staleCount}</p>
          </Link>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-500">Fresh (&lt;30d)</p>
            <p className="text-lg font-bold text-emerald-400">{freshCount}</p>
          </div>
          <Link href="/admin/tools?filter=aging" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-amber-800 transition-colors">
            <p className="text-xs text-zinc-500">Aging (30-90d)</p>
            <p className="text-lg font-bold text-amber-400">{agingCount}</p>
          </Link>
          <Link href="/admin/tools?filter=stale" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-red-800 transition-colors">
            <p className="text-xs text-zinc-500">Stale (&gt;90d)</p>
            <p className="text-lg font-bold text-red-400">{staleCount}</p>
          </Link>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: undefined, label: 'All' },
          { key: 'stale', label: 'Stale (90d+)' },
          { key: 'aging', label: 'Aging (30-90d)' },
          { key: 'draft', label: 'Drafts' },
        ].map((f) => (
          <Link
            key={f.key ?? 'all'}
            href={f.key ? `/admin/tools?filter=${f.key}` : '/admin/tools'}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Pricing</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Rating</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Views</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Freshness</th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tools?.map((tool) => {
              const f = freshnessLabel(tool.last_verified_at)
              return (
                <tr key={tool.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-white">{tool.name}</span>
                      {tool.is_featured && (
                        <span className="ml-2 text-[10px] font-medium text-amber-400 bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded">
                          Featured
                        </span>
                      )}
                      {tool.is_sponsored && (
                        <span className="ml-1 text-[10px] font-medium text-blue-400 bg-blue-950 border border-blue-800 px-1.5 py-0.5 rounded">
                          Sponsored
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">/{tool.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400 capitalize">{tool.pricing_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400">
                      {Number(tool.avg_rating) > 0 ? `${tool.avg_rating} (${tool.review_count})` : 'No reviews'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400">{tool.view_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${f.color}`}>{f.text}</span>
                    {tool.last_verified_at && (
                      <span className="block text-[10px] text-zinc-600">
                        {new Date(tool.last_verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tool.is_published ? (
                      <span className="text-xs text-emerald-400">Published</span>
                    ) : (
                      <span className="text-xs text-zinc-500">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToolActions id={tool.id} slug={tool.slug} name={tool.name} isPublished={tool.is_published} submittedBy={tool.submitted_by} hasBadge={tool.submitted_by ? badgeHolders.has(tool.submitted_by) : false} />
                  </td>
                </tr>
              )
            })}
            {(!tools || tools.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                  {filter ? `No ${filter} tools found.` : 'No tools yet. Run the seed migration or add one manually.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
