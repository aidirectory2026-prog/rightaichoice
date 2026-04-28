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

  // Phase 7 Step 56 (BUG-018): count published tools per category, not raw
  // tool_categories rows. Inner-joining `tools` with is_published=true filters
  // out drafts/unpublished tools so the per-category count matches what
  // /tools?category=<slug> actually renders. Without the filter, drafts and
  // hidden tools inflate every category's count and erode trust.
  const supabase = await createClient()
  const { data: counts } = await supabase
    .from('tool_categories')
    .select('category_id, tools!inner(is_published)')
    .eq('tools.is_published', true)
  const countMap: Record<string, number> = {}
  ;(counts ?? []).forEach((row: { category_id: string }) => {
    countMap[row.category_id] = (countMap[row.category_id] ?? 0) + 1
  })

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white">AI Tool Categories</h1>
            <p className="mt-2 text-zinc-400">
              Browse {categories.length} categories of AI tools — find the right one for your use case.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat: { id: string; slug: string; name: string; icon: string | null; description: string | null }) => (
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
