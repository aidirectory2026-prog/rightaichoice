'use client'

// Phase 12 Bug-4.10 (2026-06-27): the "all AI stacks by goal" grid was an
// unfilterable wall of ~25 cards. Stacks have no category taxonomy, so this
// adds a lightweight goal/keyword search that narrows the grid client-side.
// All cards are still server-rendered into the DOM (SSR'd client component).

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'

type StackCard = {
  slug: string
  goal: string
  description: string
  stages: number
  paidPath: string
}

export function StacksGrid({ stacks }: { stacks: StackCard[] }) {
  const [q, setQ] = useState('')
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return stacks
    return stacks.filter(
      (s) => s.goal.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
    )
  }, [stacks, q])

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((stack) => (
          <Link
            key={stack.slug}
            href={`/stacks/${stack.slug}`}
            className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
          >
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {stack.goal}
            </h3>
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
        <p className="mt-6 text-center text-sm text-zinc-500">No stacks match “{q}”.</p>
      )}
    </div>
  )
}
