'use client'

// Phase 14b Wave 3 — "Save this view" + saved-reports dropdown. Mounted inside
// the FilterBar top row, so EVERY page with the bar gets named, reloadable
// reports for free (a report = page path + full query string).

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Bookmark, Trash2 } from 'lucide-react'

type SavedReport = { id: string; name: string; payload: { path: string; query: string } }

export function ReportMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [reports, setReports] = useState<SavedReport[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  async function load() {
    const res = await fetch('/api/admin/saved-views').catch(() => null)
    const json = await res?.json().catch(() => null)
    setReports((json?.views ?? []) as SavedReport[])
  }

  async function save() {
    const n = name.trim()
    if (!n) return
    setSaving(true)
    await fetch('/api/admin/saved-views', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', name: n, path: pathname, query: params.toString() }),
    }).catch(() => null)
    setSaving(false)
    setName('')
    load()
  }

  async function remove(id: string) {
    await fetch('/api/admin/saved-views', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    }).catch(() => null)
    load()
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (reports === null) load()
        }}
        className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Save this view / open a saved report"
      >
        <Bookmark className="h-3 w-3" />
        Reports
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
              }}
              placeholder="Name this view…"
              className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="rounded border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-300 disabled:opacity-40"
            >
              Save
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {reports === null ? (
              <div className="px-2 py-3 text-center text-[11px] text-zinc-600">Loading…</div>
            ) : reports.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-zinc-600">
                No saved reports yet — set up filters, then save this view by name.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {reports.map((r) => (
                  <li key={r.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        router.push(r.payload.query ? `${r.payload.path}?${r.payload.query}` : r.payload.path)
                      }}
                      className="flex-1 rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
                      title={`${r.payload.path}${r.payload.query ? `?${r.payload.query}` : ''}`}
                    >
                      {r.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="rounded p-1 text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-rose-300"
                      aria-label={`Delete report ${r.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
