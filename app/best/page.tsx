import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { BEST_PAGES } from '@/lib/data/best-pages'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Best AI Tools Guides — RightAIChoice',
  description:
    'Curated lists of the best AI tools by category and use case. Find the top tools for writing, coding, design, productivity, SEO, and more.',
  openGraph: {
    title: 'Best AI Tools Guides 2026',
    description: 'Curated rankings of the best AI tools by use case.',
  },
}

export default function BestIndexPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Curated guides
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Best AI Tools by Use Case</h1>
            <p className="mt-3 text-zinc-400">
              Ranked, compared, and updated regularly. Find the right AI tool for what you're building.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BEST_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/best/${page.slug}`}
                className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {page.title}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                    {page.description.split('—')[0].trim()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
