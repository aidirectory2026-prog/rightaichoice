'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { analytics } from '@/lib/analytics'

// Phase 9 Stage 2 (2026-05-16): chip-based existing-tools input for the
// intake modal. Replaces the comma-separated free-text field so:
//   1. Users get autocomplete from our real tool catalog (clean canonical
//      names → match-score finds integrations more reliably).
//   2. Tools are visually discrete (chips), easier to add/remove than text.
//   3. Free-text tools the user types that aren't in our catalog are STILL
//      accepted (additive, not restrictive) — they just don't get the
//      catalog-backed integration boost.

type ToolSuggestion = { name: string; slug: string; logo_url: string | null }

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
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced fetch from our existing /api/tools/search endpoint.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tools/search?q=${encodeURIComponent(q)}`)
        const json = (await res.json()) as { tools?: ToolSuggestion[] }
        // Hide tools the user has already added.
        const lower = new Set(value.map((v) => v.toLowerCase()))
        setSuggestions((json.tools ?? []).filter((t) => !lower.has(t.name.toLowerCase())))
      } catch {
        setSuggestions([])
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, value])

  // Phase 8.g.2 — add() now takes an optional `matchedSlug` so callers from
  // the autocomplete dropdown can pass the catalog match; free-text path
  // passes null. Captured into analytics for vendor-data segmentation
  // ("which of my competitors did users name-drop?").
  function add(name: string, matchedSlug: string | null = null, source: 'autocomplete' | 'free_text' | 'pasted' = 'free_text') {
    const trimmed = name.trim()
    if (!trimmed) return
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery('')
      return
    }
    onChange([...value, trimmed])
    analytics.planExistingToolAdded({
      tool_name: trimmed,
      matched_tool_slug: matchedSlug,
      total_count: value.length + 1,
      source,
    })
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  function remove(idx: number) {
    const removed = value[idx]
    onChange(value.filter((_, i) => i !== idx))
    if (removed) {
      analytics.planExistingToolRemoved(removed, null, value.length - 1)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      // Prefer the first suggestion if open, else accept raw text.
      if (suggestions[0] && open) {
        add(suggestions[0].name, suggestions[0].slug, 'autocomplete')
      } else if (query.trim()) {
        add(query, null, 'free_text')
      }
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      remove(value.length - 1)
    }
  }

  return (
    <div>
      <div
        className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 focus-within:border-emerald-700 transition-colors"
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
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? 'Start typing a tool name…' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="relative">
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s.slug}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(s.name, s.slug, 'autocomplete')
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
              >
                <Plus className="h-3 w-3 text-emerald-400" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
