'use client'

// Phase 14 — a small URL-synced text filter for admin list pages. Commits on
// Enter or blur (not every keystroke, to avoid a server round-trip per char) and
// clears via the ✕. Writes ?<<param>>=<value> and resets any ?page= so paging
// starts over on a new search. Reused across Group B pages (tools, etc.).

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function SearchInput({
  param = 'q',
  placeholder = 'Search…',
  className = '',
}: {
  param?: string
  placeholder?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const committed = params.get(param) ?? ''
  const [draft, setDraft] = useState(committed)

  // Re-sync when the URL changes UNDER the component (saved report loaded,
  // Clear all, back/forward) — client components don't remount on
  // router.replace, so a stale draft would lie about the active filter.
  useEffect(() => {
    setDraft(committed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committed])

  function commit(value: string) {
    const sp = new URLSearchParams(params.toString())
    const v = value.trim()
    if (v) sp.set(param, v)
    else sp.delete(param)
    sp.delete('page')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft)
        }}
        onBlur={() => {
          if (draft.trim() !== (params.get(param) ?? '')) commit(draft)
        }}
        placeholder={placeholder}
        className="w-52 rounded border border-zinc-800 bg-zinc-900 py-1 pl-7 pr-7 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            commit('')
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
