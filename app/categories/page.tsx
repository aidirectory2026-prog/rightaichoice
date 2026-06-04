import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { getCategories } from '@/lib/data/categories'
import { createClient } from '@/lib/supabase/server'
import { itemListJsonLd, faqPageJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'AI Tool Categories — Best AI Tools by Category',
  description:
    'Browse the best AI tools by category — writing, coding, image generation, video, marketing, productivity, and more. Each category ranked on features, price, and real user sentiment.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'AI Tool Categories — Best AI Tools by Category',
    description: 'Explore the best AI tools organized by category.',
    url: 'https://rightaichoice.com/categories',
    type: 'website',
  },
}

const CATEGORY_FAQS: { question: string; answer: string; links?: { label: string; href: string }[] }[] = [
  {
    question: 'How do I choose the right AI tool category?',
    answer:
      'Start from the job you need done — writing, coding, images, video, marketing — and open that category to see the best-rated tools for it. If your project spans several categories, the planner assembles a complete stack across them.',
    links: [{ label: 'Plan my AI stack', href: '/plan' }],
  },
  {
    question: 'What’s the difference between a category and a stack?',
    answer:
      'A category groups AI tools that do the same job (e.g. image generation). A stack combines tools across categories into an end-to-end workflow for a goal or role.',
    links: [{ label: 'Browse AI stacks', href: '/stacks' }],
  },
  {
    question: 'How are the tools in each category ranked?',
    answer:
      'On independent criteria — features, pricing, integrations, and aggregated real user sentiment — never pay-for-placement.',
    links: [{ label: 'How we rank tools', href: '/methodology' }],
  },
  {
    question: 'Are the AI tools listed here free?',
    answer:
      'Many have a free tier. Each tool shows its current pricing (including free plans), so you can filter by what fits your budget.',
  },
]

export default async function CategoriesPage() {
  const categories = await getCategories()

  // Phase 9.B — count published tools per category via a grouped-count RPC.
  const supabase = await createClient()
  const { data: counts } = await supabase.rpc('category_published_counts')
  const countMap: Record<string, number> = {}
  ;(counts ?? []).forEach((row: { category_id: string; n: number }) => {
    countMap[row.category_id] = Number(row.n)
  })

  // Hide categories with 0 published tools (no empty thin pages).
  const visibleCategories = (categories as Array<{ id: string; slug: string; name: string; icon: string | null; description: string | null }>)
    .filter((c) => (countMap[c.id] ?? 0) > 0)

  return (
    <>
      <script
        {...jsonLdScriptProps([
          itemListJsonLd(
            'AI Tool Categories',
            'Browse the best AI tools organized by category.',
            '/categories',
            visibleCategories.map((c) => ({ name: c.name, url: `/categories/${c.slug}` })),
          ),
          faqPageJsonLd(CATEGORY_FAQS.map(({ question, answer }) => ({ question, answer }))),
        ])}
      />
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs crumbs={[{ name: 'Home', url: '/' }, { name: 'Categories', url: '/categories' }]} />

          {/* Header */}
          <div className="mb-10 mt-4">
            <h1 className="text-3xl font-bold text-white">Best AI Tools by Category</h1>
            <p className="mt-2 text-zinc-400 max-w-2xl leading-relaxed">
              Browse {visibleCategories.length} categories of AI tools — pick the one that matches your
              job to see the top-rated tools, or combine categories into a complete stack.
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

          {/* FAQ */}
          <section className="mt-16 max-w-3xl">
            <h2 className="text-xl font-semibold text-white mb-6">Frequently asked questions</h2>
            <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
              {CATEGORY_FAQS.map((faq) => (
                <details key={faq.question} className="group px-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-medium text-zinc-200 marker:content-['']">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-5 text-sm text-zinc-400 leading-relaxed">
                    <p>{faq.answer}</p>
                    {faq.links && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        {faq.links.map((l) => (
                          <Link key={l.href} href={l.href} className="text-emerald-400 hover:text-emerald-300">
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}
