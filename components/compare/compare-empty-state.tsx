'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Scale, Search, Plus, X, Loader2 } from 'lucide-react'
import { ToolLogo } from '@/components/tools/tool-logo'

type SelectedTool = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  website_url?: string | null
}

type SearchResult = SelectedTool

export function CompareEmptyState() {
  const router = useRouter()
  const [selected, setSelected] = useState<SelectedTool[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/tools/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.tools ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const addTool = (tool: SearchResult) => {
    if (selected.length >= 3 || selected.some((s) => s.id === tool.id)) return
    setSelected((prev) => [...prev, tool])
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const removeTool = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id))
  }

  const handleCompare = () => {
    if (selected.length < 2) return
    const slugs = selected.map((s) => s.slug).join(',')
    router.push(`/compare?tools=${slugs}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-8">
        <Scale className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Compare AI Tools</h1>
        <p className="text-zinc-500">
          Search and select 2–3 tools to compare them side by side.
        </p>
      </div>

      {/* Selected tools */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {selected.map((tool, i) => (
            <div key={tool.id} className="flex items-center">
              {i > 0 && <span className="text-zinc-600 font-bold mx-2">vs</span>}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                <ToolLogo
                  tool={tool}
                  size={24}
                  className="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 overflow-hidden"
                  fallbackClassName="text-[9px] font-bold text-zinc-400"
                />
                <span className="text-sm font-medium text-zinc-300">{tool.name}</span>
                <button onClick={() => removeTool(tool.id)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      {selected.length < 3 && (
        <div ref={wrapperRef} className="relative mx-auto max-w-md mb-6">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 focus-within:border-zinc-600 transition-colors">
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={selected.length === 0 ? 'Search for a tool to compare...' : 'Add another tool...'}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 text-zinc-500 animate-spin shrink-0" />}
          </div>

          {/* Results dropdown */}
          {focused && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden z-50">
              {results.map((tool) => {
                const alreadySelected = selected.some((s) => s.id === tool.id)
                return (
                  <button
                    key={tool.id}
                    onClick={() => !alreadySelected && addTool(tool)}
                    disabled={alreadySelected}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      alreadySelected ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-800'
                    }`}
                  >
                    <ToolLogo
                      tool={tool}
                      size={28}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 overflow-hidden"
                      fallbackClassName="text-[10px] font-bold text-zinc-400"
                    />
                    <span className="text-sm text-zinc-300">{tool.name}</span>
                    {alreadySelected ? (
                      <span className="ml-auto text-[10px] text-zinc-600">Selected</span>
                    ) : (
                      <Plus className="ml-auto h-4 w-4 text-zinc-600" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* No results */}
          {focused && query.length >= 2 && !loading && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl p-4 z-50">
              <p className="text-sm text-zinc-500 text-center">No tools found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Compare button */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleCompare}
          disabled={selected.length < 2}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Compare {selected.length >= 2 ? `(${selected.length} tools)` : ''}
        </button>
        <Link
          href="/tools"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
        >
          Browse Tools
        </Link>
      </div>
    </div>
  )
}
