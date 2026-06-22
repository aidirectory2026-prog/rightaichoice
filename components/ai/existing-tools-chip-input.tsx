'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Plus, Search, CornerDownLeft } from 'lucide-react'
import { analytics } from '@/lib/analytics'

// Phase 9 Stage 2 (2026-05-16): chip-based existing-tools input for the intake.
// Phase 12 Bug-1 (2026-06-22): rebuilt as a proper combobox for the full-screen
// wizard — autocomplete from our real catalog (with logos), an EXPLICIT
// "Add '<typed>'" row so free-text entry is discoverable, keyboard navigation
// (↑/↓/Enter), and one-tap popular picks. Behaviour is additive, never
// restrictive: anything the user types is accepted; catalog matches just carry
// their slug so the planner can build integrations around them.
//   1. Dropdown lists canonical catalog names (clean → reliable integration match).
//   2. Tools are discrete chips, easy to add/remove, unlimited count.
//   3. Free-text tools not in our catalog are STILL accepted (own entry).

type ToolSuggestion = { name: string; slug: string; logo_url: string | null }

// Curated, near-certain catalog hits — one-tap so "pick from our tools" is
// immediate before the user types anything.
const POPULAR_TOOLS = ['ChatGPT', 'Claude', 'Notion', 'Figma', 'Canva', 'Zapier', 'Midjourney', 'GitHub Copilot']

export function ExistingToolsChipInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trimmed = query.trim()

  // Debounced fetch from our existing /api/tools/search endpoint. All state
  // writes happen inside the (async) timeout callbacks — never synchronously in
  // the effect body — so the keyboard-highlight reset rides along with each.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (trimmed.length < 2) {
      debounceRef.current = setTimeout(() => {
        setSuggestions([])
        setActiveIndex(-1)
      }, 0)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tools/search?q=${encodeURIComponent(trimmed)}`)
        const json = (await res.json()) as { tools?: ToolSuggestion[] }
        const lower = new Set(value.map((v) => v.toLowerCase()))
        setSuggestions((json.tools ?? []).filter((t) => !lower.has(t.name.toLowerCase())).slice(0, 6))
      } catch {
        setSuggestions([])
      }
      setActiveIndex(-1)
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [trimmed, value])

  // Show an explicit "Add '<typed>'" row unless the text exactly matches a
  // suggestion (then the suggestion already covers it) or is already added.
  const showAddOwn = useMemo(() => {
    if (!trimmed) return false
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return false
    if (suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return false
    return true
  }, [trimmed, value, suggestions])

  // Flat list of navigable rows: each suggestion, then the add-your-own row.
  const rows = useMemo(
    () => [
      ...suggestions.map((s) => ({ kind: 'suggestion' as const, s })),
      ...(showAddOwn ? [{ kind: 'add_own' as const }] : []),
    ],
    [suggestions, showAddOwn],
  )

  function add(name: string, matchedSlug: string | null, source: 'autocomplete' | 'free_text' | 'pasted') {
    const t = name.trim()
    if (!t) return
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setQuery('')
      return
    }
    onChange([...value, t])
    analytics.planExistingToolAdded({
      tool_name: t,
      matched_tool_slug: matchedSlug,
      total_count: value.length + 1,
      source,
    })
    setQuery('')
    setSuggestions([])
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function remove(idx: number) {
    const removed = value[idx]
    onChange(value.filter((_, i) => i !== idx))
    if (removed) analytics.planExistingToolRemoved(removed, null, value.length - 1)
  }

  function commitRow(i: number) {
    const row = rows[i]
    if (!row) {
      if (trimmed) add(trimmed, null, 'free_text')
      return
    }
    if (row.kind === 'suggestion') add(row.s.name, row.s.slug, 'autocomplete')
    else add(trimmed, null, 'free_text')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rows.length) setActiveIndex((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length) setActiveIndex((i) => (i <= 0 ? rows.length - 1 : i - 1))
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (activeIndex >= 0) commitRow(activeIndex)
      else if (rows.length) commitRow(0) // default to the first row (top suggestion / add-own)
      else if (trimmed) add(trimmed, null, 'free_text')
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      remove(value.length - 1)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const dropdownOpen = open && rows.length > 0

  return (
    <div>
      {/* One-tap popular picks — only before anything is added AND before the
          user types (so they don't fight the dropdown for vertical space). */}
      {value.length === 0 && !trimmed && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {POPULAR_TOOLS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name, null, 'autocomplete')}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-emerald-700/50 hover:text-emerald-300 transition-colors"
            >
              <Plus className="h-2.5 w-2.5" />
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 focus-within:border-emerald-700 transition-colors"
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((tool, i) => (
            <span
              key={`${tool}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-800/50 bg-emerald-950/40 px-2 py-1 text-xs font-medium text-emerald-200"
            >
              {tool}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(i)
                }}
                aria-label={`Remove ${tool}`}
                className="text-emerald-400/70 hover:text-emerald-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex min-w-[140px] flex-1 items-center gap-1.5">
            {value.length === 0 && <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600" />}
            <input
              ref={inputRef}
              type="text"
              value={query}
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls="existing-tools-listbox"
              aria-autocomplete="list"
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
              placeholder={value.length === 0 ? 'Search our tools — or type your own…' : 'Add another…'}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {dropdownOpen && (
          <div id="existing-tools-listbox" role="listbox" className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-56 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
            {suggestions.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(s.name, s.slug, 'autocomplete')
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  activeIndex === i ? 'bg-zinc-900 text-white' : 'text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <ToolLogo name={s.name} src={s.logo_url} />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-[10px] text-zinc-600">in our catalog</span>
              </button>
            ))}
            {showAddOwn && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(trimmed, null, 'free_text')
                }}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                className={`flex w-full items-center gap-2.5 border-t border-zinc-800/70 px-3 py-2 text-left text-sm transition-colors ${
                  activeIndex === suggestions.length ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/40 text-emerald-300">
                  <Plus className="h-3 w-3" />
                </span>
                <span className="flex-1 truncate">
                  Add <span className="font-medium text-white">&ldquo;{trimmed}&rdquo;</span>
                </span>
                <CornerDownLeft className="h-3 w-3 text-zinc-600" />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-zinc-600">
        Pick from our catalog or add your own — add as many as you like.
      </p>
    </div>
  )
}

// Small logo with a graceful letter-fallback (no next/image config needed for
// the various CDNs; a plain img keeps it simple and safe).
function ToolLogo({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-400">
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      onError={() => setFailed(true)}
      className="h-5 w-5 shrink-0 rounded-md object-contain"
    />
  )
}
