/**
 * Phase 7H — Related comparisons rail.
 *
 * Shared component used by /compare/[slug] (bottom) and /categories/[slug]
 * (in-page section) to surface 4-6 sibling editorial compares. Pure
 * presentational — accepts pre-fetched RelatedCompare[] from the
 * lib/seo/internal-links.ts helpers; no internal data fetching.
 *
 * Each card is a contextual internal link: anchor text includes both
 * tool names + the page-type "comparison" so it's a strong topical
 * signal for PageRank flow.
 */
import Link from 'next/link'
import { Scale } from 'lucide-react'
import type { RelatedCompare } from '@/lib/seo/internal-links'

export function RelatedComparesRail({
  compares,
  heading = 'More comparisons you might want',
  emptyState = null,
}: {
  compares: RelatedCompare[]
  heading?: string
  emptyState?: React.ReactNode
}) {
  if (compares.length === 0) {
    return emptyState ? <>{emptyState}</> : null
  }

  return (
    <section className="mt-12 border-t border-zinc-800 pt-8">
      <div className="mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {compares.map((c) => {
          const title = c.toolNames.join(' vs ')
          return (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-950/30"
            >
              <div className="flex items-start gap-2">
                <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-emerald-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white group-hover:text-emerald-300 line-clamp-1">
                    {title} comparison
                  </div>
                  {c.verdict && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 group-hover:text-zinc-400">
                      {c.verdict}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
