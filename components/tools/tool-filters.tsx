'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

type Category = { id: string; name: string; slug: string; icon: string | null }

const PRICING_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'contact', label: 'Contact Sales' },
]

const SKILL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'api', label: 'API' },
  { value: 'plugin', label: 'Plugin' },
  { value: 'cli', label: 'CLI' },
]

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'alphabetical', label: 'A–Z' },
]

export function ToolFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category') ?? ''
  const currentPricing = searchParams.get('pricing') ?? ''
  const currentSkill = searchParams.get('skill_level') ?? ''
  const currentPlatform = searchParams.get('platform') ?? ''
  const currentSort = searchParams.get('sort') ?? 'trending'
  const currentSearch = searchParams.get('search') ?? ''
  const hasApi = searchParams.get('has_api') === 'true'

  const hasActiveFilters =
    currentCategory || currentPricing || currentSkill || currentPlatform || hasApi || currentSearch

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset page when filters change
      params.delete('page')
      router.push(`/tools?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearAll = useCallback(() => {
    router.push('/tools')
  }, [router])

  return (
    <div className="space-y-4">
      {/* Top bar: sort + clear */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="ml-2 flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Clear all <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 min-h-[40px] text-sm text-white focus:border-emerald-600 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap gap-2">
        {/* Category */}
        <FilterSelect
          label="Category"
          value={currentCategory}
          onChange={(v) => updateParam('category', v)}
          options={categories.map((c) => ({ value: c.slug, label: `${c.icon ?? ''} ${c.name}` }))}
        />

        {/* Pricing */}
        <FilterSelect
          label="Pricing"
          value={currentPricing}
          onChange={(v) => updateParam('pricing', v)}
          options={PRICING_OPTIONS}
        />

        {/* Skill Level */}
        <FilterSelect
          label="Skill Level"
          value={currentSkill}
          onChange={(v) => updateParam('skill_level', v)}
          options={SKILL_OPTIONS}
        />

        {/* Platform */}
        <FilterSelect
          label="Platform"
          value={currentPlatform}
          onChange={(v) => updateParam('platform', v)}
          options={PLATFORM_OPTIONS}
        />

        {/* Has API toggle */}
        <button
          onClick={() => updateParam('has_api', hasApi ? '' : 'true')}
          className={`inline-flex items-center rounded-lg border px-3 min-h-[40px] text-sm transition-colors ${
            hasApi
              ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white'
          }`}
        >
          Has API
        </button>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {currentSearch && (
            <FilterPill
              label={`Search: "${currentSearch}"`}
              onRemove={() => updateParam('search', '')}
            />
          )}
          {currentCategory && (
            <FilterPill
              label={categories.find((c) => c.slug === currentCategory)?.name ?? currentCategory}
              onRemove={() => updateParam('category', '')}
            />
          )}
          {currentPricing && (
            <FilterPill
              label={PRICING_OPTIONS.find((o) => o.value === currentPricing)?.label ?? currentPricing}
              onRemove={() => updateParam('pricing', '')}
            />
          )}
          {currentSkill && (
            <FilterPill
              label={SKILL_OPTIONS.find((o) => o.value === currentSkill)?.label ?? currentSkill}
              onRemove={() => updateParam('skill_level', '')}
            />
          )}
          {currentPlatform && (
            <FilterPill
              label={PLATFORM_OPTIONS.find((o) => o.value === currentPlatform)?.label ?? currentPlatform}
              onRemove={() => updateParam('platform', '')}
            />
          )}
          {hasApi && (
            <FilterPill label="Has API" onRemove={() => updateParam('has_api', '')} />
          )}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border px-3 min-h-[40px] text-sm focus:border-emerald-600 focus:outline-none transition-colors ${
        value
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
          : 'border-zinc-700 bg-zinc-900 text-zinc-400'
      }`}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
      {label}
      <button onClick={onRemove} className="text-zinc-500 hover:text-white transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
