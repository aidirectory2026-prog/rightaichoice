/**
 * Phase 5.3 pagination (2026-05-08): paginated listing control for /tools,
 * /categories/[slug], /search.
 *
 * Phase 9 Smart SEO (2026-05-30): converted from <button onClick=router.push>
 * to crawlable <Link href> — same fix as ComparePagination. The button version
 * meant Googlebot only ever saw page 1 of a listing and couldn't follow
 * pagination, leaving deep-listed tools undiscovered. Real <a href> links let
 * the crawler reach every page. Client component only to read query params.
 */
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { analytics } from '@/lib/analytics'

export function ToolPagination({
  page,
  totalPages,
  total,
}: {
  page: number
  totalPages: number
  total: number
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  if (totalPages <= 1) return null

  function hrefFor(p: number): string {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) params.delete('page')
    else params.set('page', String(p))
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  // 10.7c.6 — pagination_clicked on every prev/next/numbered link. onClick
  // fires before the <Link> client navigation, so nothing is lost; crawler
  // <a href> behavior (Phase 9 Smart SEO) is untouched.
  function trackPage(toPage: number) {
    analytics.paginationClicked({
      page_path: pathname,
      from_page: page,
      to_page: toPage,
      total_pages: totalPages,
    })
  }

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const arrowCls =
    'rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors'
  const disabledCls = 'opacity-30 cursor-not-allowed'

  return (
    <div className="flex items-center justify-between pt-8">
      <p className="text-sm text-zinc-500">
        {total} tool{total !== 1 ? 's' : ''} found
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            rel="prev"
            className={arrowCls}
            aria-label="Previous page"
            onClick={() => trackPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${arrowCls} ${disabledCls}`} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {start > 1 && (
          <>
            <PageLink page={1} current={page} href={hrefFor(1)} onNavigate={trackPage} />
            {start > 2 && <span className="px-1 text-zinc-600">...</span>}
          </>
        )}

        {pages.map((p) => (
          <PageLink key={p} page={p} current={page} href={hrefFor(p)} onNavigate={trackPage} />
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-zinc-600">...</span>}
            <PageLink page={totalPages} current={page} href={hrefFor(totalPages)} onNavigate={trackPage} />
          </>
        )}

        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            rel="next"
            className={arrowCls}
            aria-label="Next page"
            onClick={() => trackPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${arrowCls} ${disabledCls}`} aria-disabled="true">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  )
}

function PageLink({
  page,
  current,
  href,
  onNavigate,
}: {
  page: number
  current: number
  href: string
  onNavigate: (toPage: number) => void
}) {
  const isActive = page === current
  return (
    <Link
      href={href}
      onClick={() => onNavigate(page)}
      aria-current={isActive ? 'page' : undefined}
      className={`min-w-[36px] rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors text-center ${
        isActive
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
      }`}
    >
      {page}
    </Link>
  )
}
