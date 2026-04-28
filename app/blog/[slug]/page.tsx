import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, User, ChevronRight, ArrowLeft } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getAllPosts, getPostBySlug } from '@/lib/data/blog'
import { mdxComponents } from '@/components/blog/mdx-components'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Post Not Found' }

  const { meta } = post
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: meta.publishedAt,
      authors: [meta.author],
      ...(meta.image && { images: [{ url: meta.image, alt: meta.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      ...(meta.image && { images: [meta.image] }),
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const { meta, content } = post

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.title,
    description: meta.description,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt ?? meta.publishedAt,
    author: {
      '@type': 'Organization',
      name: meta.author,
      url: 'https://rightaichoice.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'RightAIChoice',
      url: 'https://rightaichoice.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://rightaichoice.com/icon.png',
      },
    },
    mainEntityOfPage: `https://rightaichoice.com/blog/${slug}`,
    ...(meta.image && { image: meta.image }),
  }

  const faqJsonLd =
    meta.faqs && meta.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: meta.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null

  const jsonLdBlocks: Record<string, unknown>[] = [
    articleJsonLd,
    breadcrumbJsonLd([
      { name: 'Home', url: 'https://rightaichoice.com' },
      { name: 'Blog', url: 'https://rightaichoice.com/blog' },
      { name: meta.title, url: `https://rightaichoice.com/blog/${slug}` },
    ]),
  ]
  if (faqJsonLd) jsonLdBlocks.push(faqJsonLd)

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdBlocks),
        }}
      />

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-300 truncate max-w-[300px]">{meta.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {meta.title}
            </h1>
            <p className="mt-3 text-lg text-zinc-400">{meta.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(meta.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {meta.author}
              </span>
            </div>
            {meta.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {meta.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-0.5 text-xs text-zinc-400"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* MDX content */}
          <div className="prose-custom">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: {}, blockJS: false, blockDangerousJS: true }}
            />
          </div>

          {/* FAQs (if provided in frontmatter — also drives FAQPage schema) */}
          {meta.faqs && meta.faqs.length > 0 && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Frequently asked questions</h2>
              <div className="space-y-4">
                {meta.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 open:bg-zinc-900/50"
                  >
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-base font-semibold text-white">
                      <span>{f.q}</span>
                      <span className="text-zinc-500 group-open:rotate-180 transition-transform shrink-0">▾</span>
                    </summary>
                    <p className="mt-3 text-zinc-300 leading-relaxed text-sm">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Tool links */}
          {meta.tools.length > 0 && (
            <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                Tools mentioned in this post
              </h3>
              <div className="flex flex-wrap gap-2">
                {meta.tools.map((toolSlug) => (
                  <Link
                    key={toolSlug}
                    href={`/tools/${toolSlug}`}
                    className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/50 px-3 min-h-[40px] text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:border-zinc-600 transition-colors"
                  >
                    {toolSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all posts
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
