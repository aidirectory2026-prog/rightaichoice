import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getCategories } from '@/lib/data/categories'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'AI Tool Categories',
  description:
    'Browse AI tools by category. Find the best AI tools for writing, coding, image generation, video, productivity, and more.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'AI Tool Categories — RightAIChoice',
    description: 'Explore AI tools organized by category.',
    url: '/categories',
  },
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  // Phase 9.B — count published tools per category via a grouped-count RPC.
  // The previous approach selected the whole tool_categories junction and
  // tallied in JS, but PostgREST caps an un-paginated select at 1000 rows and
  // there are 3,500+ published junction rows — so every category count was
  // silently undercounted. The RPC returns ~one row per category (group by),
  // well under the cap, and matches what /tools?category=<slug> renders.
  const supabase = await createClient()
  const { data: counts } = await supabase.rpc('category_published_counts')
  const countMap: Record<string, number> = {}
  ;(counts ?? []).forEach((row: { category_id: string; n: number }) => {
    countMap[row.category_id] = Number(row.n)
  })

  // Phase 9 (Automations & Catalog) D1 — hide categories with 0 published tools
  // (category_published_counts only returns categories that HAVE tools, so any
  // category missing from countMap is empty). Keeps newly-added categories
  // (e.g. developer-infrastructure) off the public listing until the P0 tools
  // populate them — no empty thin pages.
  const visibleCategories = (categories as Array<{ id: string; slug: string; name: string; icon: string | null; description: string | null }>)
    .filter((c) => (countMap[c.id] ?? 0) > 0)

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white">AI Tool Categories</h1>
            <p className="mt-2 text-zinc-400">
              Browse {visibleCategories.length} categories of AI tools — find the right one for your use case.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{cat.icon ?? '🤖'}</span>
                  {countMap[cat.id] != null && (
                    <span className="text-xs text-zinc-600">
                      {countMap[cat.id]} tool{countMap[cat.id] !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{cat.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
