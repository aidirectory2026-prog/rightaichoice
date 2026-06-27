'use client'

// Phase 12 Bug-4.10 (2026-06-27) + smart-filter upgrade (2026-06-28): the blog
// index now has a real filter bar — keyword search (title + description) +
// category chips (with per-category counts) + newest/oldest sort + a live result
// count. Client-side, but all posts are server-rendered into the DOM (this
// client component is SSR'd) so SEO/crawlers see the full list.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, User, Tag, Search, X } from 'lucide-react'
import { FilterChips } from '@/components/ui/filter-chips'

type Post = {
  slug: string
  title: string
  description: string
  publishedAt: string
  author: string
  categories: string[]
}

export function BlogList({ posts }: { posts: Post[] }) {
  // Category options with counts, most-used first, plus an "All" head.
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of posts) for (const c of p.categories) counts.set(c, (counts.get(c) ?? 0) + 1)
    const cats = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }))
    return [{ value: 'All', label: 'All', count: posts.length }, ...cats]
  }, [posts])

  const [active, setActive] = useState<string>('All')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = posts.filter((p) => {
      if (active !== 'All' && !p.categories.includes(active)) return false
      if (term && !(`${p.title} ${p.description}`.toLowerCase().includes(term))) return false
      return true
    })
    return filtered.sort((a, b) => {
      const da = new Date(a.publishedAt).getTime()
      const db = new Date(b.publishedAt).getTime()
      return sort === 'newest' ? db - da : da - db
    })
  }, [posts, active, q, sort])

  const filtered = active !== 'All' || q.trim().length > 0

  return (
    <div className="mt-8">
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts…"
              aria-label="Search posts"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
            className="ml-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-emerald-600 focus:outline-none"
            aria-label="Sort posts"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <FilterChips options={categoryOptions} active={active} onSelect={setActive} />

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            {visible.length} {visible.length === 1 ? 'post' : 'posts'}
          </span>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setActive('All')
                setQ('')
              }}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {visible.map((post) => (
          <article
            key={post.slug}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 transition-colors"
          >
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {post.title}
              </h2>
            </Link>
            <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{post.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {post.author}
              </span>
              {post.categories.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {post.categories.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => setActive(c)}
                        className="hover:text-emerald-400 transition-colors"
                      >
                        {c}
                      </button>
                    </span>
                  ))}
                </span>
              )}
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-sm text-zinc-500">No posts match these filters.</p>
        )}
      </div>
    </div>
  )
}
