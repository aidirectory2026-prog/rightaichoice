/**
 * Phase 7H follow-up (2026-05-13): pagination control for the /compare
 * hub's "all editorial comparisons" listing. Mirrors ToolPagination's
 * behavior + style but with the right noun ("comparison" not "tool")
 * and uses the current pathname so the same URL pattern works.
 */
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  if (totalPages <= 1) return null

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(p))
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="mt-8 flex items-center justify-between border-t border-zinc-800/50 pt-6">
      <p className="text-sm text-zinc-500">
        {total.toLocaleString()} comparison{total !== 1 ? 's' : ''} · page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => goToPage(1)} className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white">
              1
            </button>
            {start > 2 && <span className="px-1 text-zinc-600">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`rounded-md border px-3 py-1 text-sm transition-colors ${
              p === page
                ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-zinc-600">…</span>}
            <button onClick={() => goToPage(totalPages)} className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white">
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
