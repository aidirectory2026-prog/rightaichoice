'use client'

// Phase 12 (2026-06-28): category + sort filter for the /compare hub. URL-param
// driven (?category=&sort=) like the /tools ToolFilters, so it's server-side
// filtered + crawlable + survives pagination (ComparePagination copies the
// query string). Changing a filter resets to page 1.

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, X } from 'lucide-react'

export function CompareFilters({
  categories,
  total,
}: {
  categories: { slug: string; name: string }[]
  total: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'recent'

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page') // filter change → back to page 1
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const active = category !== '' || sort === 'popular'
  const selectCls =
    'appearance-none rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-3 pr-8 text-xs text-zinc-200 focus:border-emerald-600 focus:outline-none'

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="relative">
        <select
          value={category}
          onChange={(e) => update('category', e.target.value)}
          aria-label="Filter comparisons by category"
          className={selectCls}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      </div>

      <div className="relative">
        <select
          value={sort}
          onChange={(e) => update('sort', e.target.value === 'popular' ? 'popular' : '')}
          aria-label="Sort comparisons"
          className={selectCls}
        >
          <option value="recent">Newest</option>
          <option value="popular">Most viewed</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      </div>

      {active && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}

      <span className="ml-auto text-xs text-zinc-500">
        {total.toLocaleString()} {total === 1 ? 'comparison' : 'comparisons'}
      </span>
    </div>
  )
}
