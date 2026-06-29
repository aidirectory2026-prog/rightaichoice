'use client'

// Phase 12 Bug-4.10 (2026-06-27) + smart-filter upgrade (2026-06-28): the "all
// AI stacks by goal" grid now has real filters — keyword search (goal +
// description) + skill-level chips (Beginner/Intermediate/Advanced, with counts)
// + a "Free to start" toggle (stacks with a $0 free path) + a live count. Stacks
// have no category taxonomy, so these are the meaningful dimensions. All cards
// are server-rendered into the DOM (SSR'd client component) — SEO-safe.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X } from 'lucide-react'
import { FilterChips } from '@/components/ui/filter-chips'

type StackCard = {
  slug: string
  goal: string
  description: string
  stages: number
  paidPath: string
  freePath: string
  skillLevel: string
}

type SkillFilter = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'

export function StacksGrid({ stacks }: { stacks: StackCard[] }) {
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState<SkillFilter>('All')
  const [freeOnly, setFreeOnly] = useState(false)

  const skillOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of stacks) counts.set(s.skillLevel, (counts.get(s.skillLevel) ?? 0) + 1)
    return [
      { value: 'All' as const, label: 'All levels', count: stacks.length },
      { value: 'Beginner' as const, label: 'Beginner', count: counts.get('Beginner') ?? 0 },
      { value: 'Intermediate' as const, label: 'Intermediate', count: counts.get('Intermediate') ?? 0 },
      { value: 'Advanced' as const, label: 'Advanced', count: counts.get('Advanced') ?? 0 },
    ]
  }, [stacks])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return stacks.filter((s) => {
      if (skill !== 'All' && s.skillLevel !== skill) return false
      if (freeOnly && !s.freePath.trim().startsWith('$0')) return false
      if (term && !(`${s.goal} ${s.description}`.toLowerCase().includes(term))) return false
      return true
    })
  }, [stacks, q, skill, freeOnly])

  const active = q.trim().length > 0 || skill !== 'All' || freeOnly

  return (
    <div>
      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter stacks by goal…"
              aria-label="Filter stacks by goal"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="button"
            onClick={() => setFreeOnly((v) => !v)}
            aria-pressed={freeOnly}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              freeOnly
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            Free to start
          </button>
        </div>

        <FilterChips options={skillOptions} active={skill} onSelect={setSkill} />

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            {visible.length} {visible.length === 1 ? 'stack' : 'stacks'}
          </span>
          {active && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setSkill('All')
                setFreeOnly(false)
              }}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((stack) => (
          <Link
            key={stack.slug}
            href={`/stacks/${stack.slug}`}
            className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {stack.goal}
              </h3>
              <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                {stack.skillLevel}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed flex-1 line-clamp-2">
              {stack.description}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-zinc-600">{stack.stages} stages</span>
              <span className="text-emerald-500/70">{stack.paidPath}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              View stack <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="mt-6 text-center text-sm text-zinc-500">No stacks match these filters.</p>
      )}
    </div>
  )
}
