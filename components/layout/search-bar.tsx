'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ArrowRight, Tag, FolderOpen } from 'lucide-react'
import { autocompleteSearch } from '@/actions/search'
import { ToolLogo } from '@/components/tools/tool-logo'

type SearchResult = {
  tools: { id: string; name: string; slug: string; tagline: string; logo_url: string | null; website_url?: string | null; pricing_type: string }[]
  categories: { id: string; name: string; slug: string; icon: string | null }[]
  tags: { id: string; name: string; slug: string }[]
}

export function SearchBar({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const isLarge = size === 'lg'
  const hasResults =
    results && (results.tools.length > 0 || results.categories.length > 0 || results.tags.length > 0)

  // Build flat list of navigable items for keyboard navigation
  const flatItems = results
    ? [
        ...results.tools.map((t) => ({ type: 'tool' as const, slug: t.slug, label: t.name })),
        ...results.categories.map((c) => ({ type: 'category' as const, slug: c.slug, label: c.name })),
        ...results.tags.map((t) => ({ type: 'tag' as const, slug: t.slug, label: t.name })),
      ]
    : []

  // Debounced search
  const handleChange = useCallback(
    (value: string) => {
      setQuery(value)
      setActiveIndex(-1)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (value.trim().length < 2) {
        setResults(null)
        setIsOpen(false)
        return
      }

      debounceRef.current = setTimeout(async () => {
        const data = await autocompleteSearch(value)
        setResults(data)
        setIsOpen(true)
      }, 250)
    },
    []
  )

  // Navigate to selected item
  function navigateTo(type: string, slug: string) {
    setIsOpen(false)
    if (type === 'tool') router.push(`/tools/${slug}`)
    else if (type === 'category') router.push(`/tools?category=${slug}`)
    else if (type === 'tag') router.push(`/tools?search=${encodeURIComponent(slug)}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setIsOpen(false)
    router.push(`/tools?search=${encodeURIComponent(trimmed)}`)
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || !hasResults) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const item = flatItems[activeIndex]
      navigateTo(item.type, item.slug)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let itemIndex = 0

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 ${
            isLarge ? 'h-5 w-5' : 'h-4 w-4'
          }`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => hasResults && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to do? e.g. &quot;edit videos with AI&quot;"
          className={`w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50 transition-colors ${
            isLarge
              ? 'pl-12 pr-28 py-4 text-base'
              : 'pl-10 pr-20 py-2.5 text-sm'
          }`}
        />
        <button
          type="submit"
          className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg bg-emerald-600 font-medium text-white hover:bg-emerald-500 transition-colors ${
            isLarge ? 'px-5 min-h-[44px] text-sm' : 'px-3 min-h-[36px] text-xs'
          }`}
        >
          Search
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Tool results */}
          {results.tools.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Tools
              </div>
              {results.tools.map((tool) => {
                const idx = itemIndex++
                return (
                  <button
                    key={tool.id}
                    onClick={() => navigateTo('tool', tool.slug)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeIndex
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <ToolLogo
                      tool={tool}
                      size={32}
                      className="flex shrink-0 items-center justify-center rounded-md bg-zinc-800 overflow-hidden"
                      fallbackClassName="text-xs font-bold text-zinc-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tool.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{tool.tagline}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Category results */}
          {results.categories.length > 0 && (
            <div className="border-t border-zinc-800">
              <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Categories
              </div>
              {results.categories.map((cat) => {
                const idx = itemIndex++
                return (
                  <button
                    key={cat.id}
                    onClick={() => navigateTo('category', cat.slug)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeIndex
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="text-sm">
                      {cat.icon} {cat.name}
                    </span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Tag results */}
          {results.tags.length > 0 && (
            <div className="border-t border-zinc-800">
              <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Use Cases
              </div>
              {results.tags.map((tag) => {
                const idx = itemIndex++
                return (
                  <button
                    key={tag.id}
                    onClick={() => navigateTo('tag', tag.name)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeIndex
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Tag className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="text-sm">{tag.name}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Search all link */}
          <div className="border-t border-zinc-800">
            <button
              onClick={handleSubmit as unknown as () => void}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-emerald-400 hover:bg-zinc-800/50 transition-colors"
            >
              <Search className="h-4 w-4" />
              Search all tools for &ldquo;{query}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
