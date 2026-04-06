'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Search, Plus, Loader2 } from 'lucide-react'
import { useCompare, type CompareItem } from '@/components/providers/compare-provider'

type SearchResult = {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export function CompareToolSearch() {
  const { add, isInCompare, isFull } = useCompare()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
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

  const handleAdd = (tool: SearchResult) => {
    const item: CompareItem = {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      logo_url: tool.logo_url,
    }
    add(item)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  if (isFull) return null

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add tool
      </button>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 py-1">
        <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools..."
          className="w-32 sm:w-44 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin shrink-0" />}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden z-50">
          {results.map((tool) => {
            const alreadyAdded = isInCompare(tool.id)
            return (
              <button
                key={tool.id}
                onClick={() => !alreadyAdded && handleAdd(tool)}
                disabled={alreadyAdded}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  alreadyAdded
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-zinc-800 cursor-pointer'
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 overflow-hidden shrink-0">
                  {tool.logo_url ? (
                    <Image
                      src={tool.logo_url}
                      alt={tool.name}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[9px] font-bold text-zinc-400">
                      {tool.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-sm text-zinc-300 truncate">{tool.name}</span>
                {alreadyAdded ? (
                  <span className="ml-auto text-[10px] text-zinc-600">Added</span>
                ) : (
                  <Plus className="ml-auto h-3.5 w-3.5 text-zinc-600" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl p-3 z-50">
          <p className="text-xs text-zinc-500 text-center">No tools found</p>
        </div>
      )}
    </div>
  )
}
