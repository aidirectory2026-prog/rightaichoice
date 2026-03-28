import Link from 'next/link'
import { ArrowRight, Wand2 } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { SearchBar } from '@/components/layout/search-bar'
import { ToolCard } from '@/components/tools/tool-card'
import { getFeaturedTools, getTrendingTools } from '@/lib/data/tools'
import { getCategories } from '@/lib/data/categories'

export default async function HomePage() {
  const [featured, trending, categories] = await Promise.all([
    getFeaturedTools(6),
    getTrendingTools(8),
    getCategories(),
  ])

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/50 px-4 py-1.5 text-sm text-emerald-400 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {featured.length + trending.length}+ AI tools indexed
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Find the <span className="text-emerald-400">right AI tool</span>
              <br />
              for what you want to do
            </h1>

            <p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Search, compare, and choose with confidence.
              Real community reviews. Structured discovery. No noise.
            </p>

            <div className="mt-10 max-w-2xl mx-auto">
              <SearchBar size="lg" />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
              <span>Popular:</span>
              {['AI writing', 'code generation', 'image generation', 'video editing', 'automation'].map(
                (term) => (
                  <Link
                    key={term}
                    href={`/tools?search=${encodeURIComponent(term)}`}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
                  >
                    {term}
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        {/* ─── Featured Tools ──────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Featured Tools</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Hand-picked AI tools worth checking out
                </p>
              </div>
              <Link
                href="/tools"
                className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Categories ──────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="text-center mb-10">
              <h2 className="text-xl font-semibold text-white">Browse by Category</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Find AI tools organized by what they do
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/tools?category=${cat.slug}`}
                  className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200 text-center"
                >
                  <span className="text-2xl mb-2">{cat.icon ?? '🔧'}</span>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Trending Tools ──────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Trending Now</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Most viewed tools this week
                </p>
              </div>
              <Link
                href="/tools?sort=trending"
                className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                See more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Recommendations CTA ─────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-950 p-10">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-400">
                <Wand2 className="h-3 w-3" />
                Personalized for you
              </div>
              <h2 className="text-2xl font-bold text-white">
                Not sure which tool to pick?
              </h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Answer 3 quick questions about your use case, budget, and skill level.
                Our AI will rank the best tools with specific reasons why each fits your needs.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-start gap-3">
                <Link
                  href="/recommend"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                  Find My Tool
                </Link>
                <Link
                  href="/ai-chat"
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Chat with AI instead
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10 text-center">
            <h2 className="text-2xl font-bold text-white">
              Join the community
            </h2>
            <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
              Ask questions, share reviews, and help others find the right AI tools.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/questions"
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Browse Q&amp;A
              </Link>
              <Link
                href="/tools"
                className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
              >
                Browse All Tools
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
