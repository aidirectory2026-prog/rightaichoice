'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ToolPagination({
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

  if (totalPages <= 1) return null

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(p))
    }
    router.push(`/tools?${params.toString()}`)
  }

  // Show a window of page numbers around current page
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between pt-8">
      <p className="text-sm text-zinc-500">
        {total} tool{total !== 1 ? 's' : ''} found
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {start > 1 && (
          <>
            <PageButton page={1} current={page} onClick={goToPage} />
            {start > 2 && <span className="px-1 text-zinc-600">...</span>}
          </>
        )}

        {pages.map((p) => (
          <PageButton key={p} page={p} current={page} onClick={goToPage} />
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-zinc-600">...</span>}
            <PageButton page={totalPages} current={page} onClick={goToPage} />
          </>
        )}

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function PageButton({
  page,
  current,
  onClick,
}: {
  page: number
  current: number
  onClick: (p: number) => void
}) {
  const isActive = page === current
  return (
    <button
      onClick={() => onClick(page)}
      className={`min-w-[36px] rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
      }`}
    >
      {page}
    </button>
  )
}
