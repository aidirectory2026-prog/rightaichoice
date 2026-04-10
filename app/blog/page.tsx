import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, User, Tag } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getAllPosts } from '@/lib/data/blog'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

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
            <div className="mt-10 space-y-8">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 transition-colors"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                    {post.description}
                  </p>
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
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
