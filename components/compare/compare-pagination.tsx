/**
 * Phase 7H follow-up (2026-05-13): pagination control for the /compare
 * hub's "all editorial comparisons" listing.
 *
 * Phase 9 Smart SEO (2026-05-30): converted from <button onClick=router.push>
 * to crawlable <Link href>. The button version meant Googlebot could only see
 * page 1 (24 compares) and never followed pagination — which is why a GSC
 * URL-Inspection sample found 64% of editorial compares "URL is unknown to
 * Google". Real <a href> links let the crawler reach every page → discover
 * every compare. Still a client component only to read current query params.
 */
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ComparePagination({
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

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const numCls =
    'rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white'
  const arrowCls =
    'inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white'
  const disabledCls = 'cursor-not-allowed opacity-40'

  return (
    <div className="mt-8 flex items-center justify-between border-t border-zinc-800/50 pt-6">
      <p className="text-sm text-zinc-500">
        {total.toLocaleString()} comparison{total !== 1 ? 's' : ''} · page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} rel="prev" className={arrowCls} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${arrowCls} ${disabledCls}`} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {start > 1 && (
          <>
            <Link href={hrefFor(1)} className={numCls}>1</Link>
            {start > 2 && <span className="px-1 text-zinc-600">…</span>}
          </>
        )}

        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'rounded-md border px-3 py-1 text-sm transition-colors border-emerald-700 bg-emerald-900/30 text-emerald-300'
                : numCls
            }
          >
            {p}
          </Link>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-zinc-600">…</span>}
            <Link href={hrefFor(totalPages)} className={numCls}>{totalPages}</Link>
          </>
        )}

        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} rel="next" className={arrowCls} aria-label="Next page">
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
