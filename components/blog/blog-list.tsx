'use client'

// Phase 12 Bug-4.10 (2026-06-27): blog index category filter. The list was a
// flat chronological feed with no way to narrow by topic. This renders category
// chips (derived from the posts) + an optional newest/oldest sort, filtering
// client-side. All posts are still server-rendered into the DOM (this client
// component is SSR'd), so SEO/crawlers see the full list.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, User, Tag } from 'lucide-react'

type Post = {
  slug: string
  title: string
  description: string
  publishedAt: string
  author: string
  categories: string[]
}

export function BlogList({ posts }: { posts: Post[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of posts) for (const c of p.categories) set.add(c)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [posts])

  const [active, setActive] = useState<string>('All')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  const visible = useMemo(() => {
    const filtered = active === 'All' ? posts : posts.filter((p) => p.categories.includes(active))
    return [...filtered].sort((a, b) => {
      const da = new Date(a.publishedAt).getTime()
      const db = new Date(b.publishedAt).getTime()
      return sort === 'newest' ? db - da : da - db
    })
  }, [posts, active, sort])

  return (
    <div className="mt-8">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active === c
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
          className="ml-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-emerald-600 focus:outline-none"
          aria-label="Sort posts"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="mt-8 space-y-8">
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
                  {post.categories.join(', ')}
                </span>
              )}
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-sm text-zinc-500">No posts in this category yet.</p>
        )}
      </div>
    </div>
  )
}
