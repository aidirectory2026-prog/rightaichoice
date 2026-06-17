'use client'

// Phase 11 — global admin search box (header). Debounced typeahead over
// /api/admin/search: users, people-by-what-they-searched, and events. Keyboard:
// Esc closes, ↑/↓ move, Enter opens. Click-away closes.

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, MessageSquareText, Activity, Loader2 } from 'lucide-react'

type Result = { kind: 'user' | 'searched' | 'event'; label: string; sublabel: string; href: string }

const KIND_ICON = { user: User, searched: MessageSquareText, event: Activity } as const

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setResults([]); setOpen(false); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`)
        const j = await r.json()
        if (!cancelled) { setResults((j.results ?? []) as Result[]); setActive(0); setOpen(true) }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const go = useCallback((r: Result) => { setOpen(false); setQ(''); router.push(r.href) }, [router])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) go(r) }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-500" /> : <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder="Search users, searches, events…"
          className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          aria-label="Search the admin"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-zinc-500">{loading ? 'Searching…' : 'No matches.'}</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((r, i) => {
                const Icon = KIND_ICON[r.kind] ?? Activity
                return (
                  <li key={`${r.kind}-${i}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${i === active ? 'bg-zinc-900' : 'hover:bg-zinc-900/60'}`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-zinc-200">{r.label}</span>
                        <span className="block truncate text-[10px] text-zinc-500">{r.sublabel}</span>
                      </span>
                      <span className="shrink-0 rounded bg-zinc-800 px-1 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">{r.kind}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
