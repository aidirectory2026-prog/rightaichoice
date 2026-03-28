import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { getCategoryBySlug } from '@/lib/data/categories'
import { getTools } from '@/lib/data/tools'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Category Not Found' }

  const title = `Best ${category.name} AI Tools in 2026`
  const description =
    category.description
      ? `${category.description} Find and compare the best ${category.name} AI tools with real reviews, pricing, and alternatives.`
      : `Find and compare the best ${category.name} AI tools. Real reviews, pricing comparison, and community insights.`

  return {
    title,
    description,
    keywords: [
      `best ${category.name} AI tools`,
      `${category.name} AI`,
      `${category.name} tools 2026`,
      `compare ${category.name} tools`,
      category.name,
    ],
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}`,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const { tools, total } = await getTools({ category: slug, sort: 'trending' })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${category.name} AI Tools`,
    description: `The best ${category.name} AI tools — compared by features, pricing, and community reviews.`,
    url: `https://rightaichoice.com/categories/${slug}`,
    numberOfItems: total,
    ...(tools.length > 0 && {
      itemListElement: tools.slice(0, 10).map((tool: { name: string; slug: string; tagline: string }, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: tool.name,
        description: tool.tagline,
        url: `https://rightaichoice.com/tools/${tool.slug}`,
      })),
    }),
  }

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link href="/categories" className="hover:text-white transition-colors">
              Categories
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-300">{category.name}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {category.icon && <span className="text-4xl">{category.icon}</span>}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Best {category.name} AI Tools
                </h1>
                <p className="mt-1 text-zinc-400">
                  {total} tool{total !== 1 ? 's' : ''} · ranked by community
                </p>
              </div>
            </div>
            {category.description && (
              <p className="mt-4 max-w-2xl text-sm text-zinc-400 leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {/* Tools grid */}
          {tools.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-500">No tools in this category yet.</p>
              <Link
                href="/tools"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
              >
                Browse all tools
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>

              {total > tools.length && (
                <div className="mt-8 text-center">
                  <Link
                    href={`/tools?category=${slug}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                  >
                    View all {total} {category.name} tools
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
