import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getAllPosts } from '@/lib/data/blog'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'
import { BlogList } from '@/components/blog/blog-list'

export const metadata: Metadata = {
  title: 'Blog — AI Tools Guides, Comparisons & Industry Analysis',
  description:
    'In-depth guides, comparisons, and analysis to help you choose the right AI tools for your workflow.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — RightAIChoice',
    description:
      'In-depth guides, comparisons, and analysis to help you choose the right AI tools for your workflow.',
    url: '/blog',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://rightaichoice.com' },
              { name: 'Blog', url: 'https://rightaichoice.com/blog' },
            ])
          ),
        }}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white">Blog</h1>
          <p className="mt-2 text-base text-zinc-400">
            Guides, comparisons, and analysis to help you build your AI stack.
          </p>

          {posts.length === 0 ? (
            <p className="mt-12 text-center text-zinc-500">
              No posts yet. Check back soon.
            </p>
          ) : (
            <BlogList
              posts={posts.map((p) => ({
                slug: p.slug,
                title: p.title,
                description: p.description,
                publishedAt: p.publishedAt,
                author: p.author,
                categories: p.categories,
              }))}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
