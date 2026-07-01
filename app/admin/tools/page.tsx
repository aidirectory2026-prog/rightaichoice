import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { SortableHeader } from '@/components/admin/sortable-header'
import { MultiSelectFilter } from '@/components/admin/multi-select-filter'
import { SearchInput } from '@/components/admin/search-input'
import { parseSort } from '@/lib/admin/sort'
import { ToolActions } from './tool-actions'

// Phase 8.d.6 — admin tools page force-dynamic; no cached stale lists.
// Phase 14 — full catalog filtering + sorting. The stale/aging/draft tabs are
// kept as quick presets; on top of them: name/slug search, pricing multi-select,
// featured/sponsored flags, and sortable columns (all URL-state, DB-level so it
// works across the whole catalog, not just the current page). The global smart
// filter bar still doesn't apply (this is catalog management, not a time window).
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Manage Tools' }

const PRICING_OPTIONS = [
  { value: 'free' },
  { value: 'freemium' },
  { value: 'paid' },
  { value: 'contact' },
]
const FLAG_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'sponsored', label: 'Sponsored' },
]

// Sort key → tools column. Default: newest first (unchanged behaviour).
const SORT_COLUMN = {
  name: 'name',
  pricing: 'pricing_type',
  rating: 'avg_rating',
  reviews: 'review_count',
  views: 'view_count',
  verified: 'last_verified_at',
  created: 'created_at',
} as const
type ToolSortKey = keyof typeof SORT_COLUMN

type SearchParams = Promise<Record<string, string | undefined>>

function listParam(v: string | undefined): string[] {
  return (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

export default async function AdminToolsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const filter = sp.filter
  const pricing = listParam(sp.pricing).filter((p) => PRICING_OPTIONS.some((o) => o.value === p))
  const flags = listParam(sp.flags)
  const q = (sp.q ?? '').trim()
  // Sanitize before it enters a PostgREST .or() string: strip characters that
  // carry meaning in the filter grammar (comma, parens, ilike wildcards) so a
  // search term can never break out of the pattern. Plain search text only.
  const qSafe = q.replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 60)
  const sort = parseSort<ToolSortKey>(sp, Object.keys(SORT_COLUMN) as ToolSortKey[], { key: 'created', dir: 'desc' })
  // A "narrowing" filter is anything beyond the default view — used to decide
  // whether the freshness-stats banner (which describes the WHOLE catalog) shows.
  const narrowed = !!filter || pricing.length > 0 || flags.length > 0 || !!qSafe

  const supabase = await createClient()

  let query = supabase
    .from('tools')
    .select('id, name, slug, pricing_type, is_published, is_featured, is_sponsored, avg_rating, review_count, view_count, created_at, last_verified_at, submitted_by')
    .order(SORT_COLUMN[sort.key], { ascending: sort.dir === 'asc', nullsFirst: false })

  // Staleness / status presets (tabs)
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

  // Phase 14 filters (AND-ed with the preset above)
  if (pricing.length) query = query.in('pricing_type', pricing)
  if (flags.includes('featured')) query = query.eq('is_featured', true)
  if (flags.includes('sponsored')) query = query.eq('is_sponsored', true)
  if (qSafe) query = query.or(`name.ilike.%${qSafe}%,slug.ilike.%${qSafe}%`)

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
  if (!narrowed) {
    for (const t of tools ?? []) {
      if (!t.is_published) continue
      if (!t.last_verified_at) { staleCount++; continue }
      if (t.last_verified_at >= d30) freshCount++
      else if (t.last_verified_at >= d90) agingCount++
      else staleCount++
    }
  }

  // Tab hrefs preserve the active search/pricing/flags/sort so switching the
  // status preset doesn't wipe the rest of the filter state.
  const tabHref = (key?: string) => {
    const p = new URLSearchParams()
    if (key) p.set('filter', key)
    for (const k of ['pricing', 'flags', 'q', 'sort', 'dir'] as const) if (sp[k]) p.set(k, sp[k]!)
    const s = p.toString()
    return s ? `/admin/tools?${s}` : '/admin/tools'
  }

  function freshnessLabel(lastVerified: string | null) {
    if (!lastVerified) return { text: 'Never', color: 'text-red-400' }
    if (lastVerified >= d30) return { text: 'Fresh', color: 'text-emerald-400' }
    if (lastVerified >= d90) return { text: 'Aging', color: 'text-amber-400' }
    return { text: 'Stale', color: 'text-red-400' }
  }

  return (
    <div>
      <PageHeader>
        <span className="text-xs text-zinc-500">{total.toLocaleString()} tools{narrowed ? ' (filtered)' : ' in database'}</span>
        <Link
          href="/admin/tools/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Tool
        </Link>
      </PageHeader>

      {/* Freshness stats (only on the unfiltered view) — kit-styled drill-down tiles */}
      {!narrowed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link href="/admin/tools" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Total Published</p>
              <MetricInfo docKey="tools_catalog_freshness" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{(freshCount + agingCount + staleCount).toLocaleString()}</p>
          </Link>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Fresh (&lt;30d)</p>
              <MetricInfo docKey="tools_catalog_freshness" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">{freshCount.toLocaleString()}</p>
          </div>
          <Link href="/admin/tools?filter=aging" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-800 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Aging (30-90d)</p>
              <MetricInfo docKey="tools_catalog_freshness" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-amber-400">{agingCount.toLocaleString()}</p>
          </Link>
          <Link href="/admin/tools?filter=stale" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-red-800 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Stale (&gt;90d)</p>
              <MetricInfo docKey="tools_catalog_freshness" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-red-400">{staleCount.toLocaleString()}</p>
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
            href={tabHref(f.key)}
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

      {/* Phase 14 — search + pricing + flags filters (AND-ed with the tab). */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <SearchInput param="q" placeholder="Search name or slug…" />
        <MultiSelectFilter label="Pricing" param="pricing" options={PRICING_OPTIONS} />
        <MultiSelectFilter label="Flags" param="flags" options={FLAG_OPTIONS} />
      </div>

      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3"><SortableHeader label="Name" sortKey="name" firstDir="asc" /></th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3"><SortableHeader label="Pricing" sortKey="pricing" firstDir="asc" /></th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3"><SortableHeader label="Rating" sortKey="rating" /></th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3"><SortableHeader label="Views" sortKey="views" /></th>
              <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3"><SortableHeader label="Freshness" sortKey="verified" /></th>
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
