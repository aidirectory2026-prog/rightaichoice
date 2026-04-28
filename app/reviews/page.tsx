import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, MessageSquare } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getRecentReviews } from '@/lib/data/reviews'

export const metadata: Metadata = {
  title: 'Community Reviews',
  description: 'Honest, structured reviews of AI tools from real users. Filter by rating, use case, and experience level.',
}

type PageProps = {
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 20

export default async function ReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { reviews, total } = await getRecentReviews(PAGE_SIZE, offset)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-400" />
              Community Reviews
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Honest, use-case driven reviews from people who actually use these tools.
            </p>
          </div>

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <Star className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">No reviews yet. Be the first to share your experience.</p>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Browse tools
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const tool = review.tools as unknown as { id: string; name: string; slug: string; logo_url: string | null }
                const author = review.profiles as unknown as { id: string; username: string; avatar_url: string | null; reputation: number }
                return (
                  <div key={review.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                    {/* Tool + rating row */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500">
                          {tool?.name?.charAt(0) ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/tools/${tool?.slug ?? ''}`}
                            className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors truncate block"
                          >
                            {tool?.name ?? 'Unknown Tool'}
                          </Link>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            by{' '}
                            <Link
                              href={`/u/${author?.username ?? ''}`}
                              className="hover:text-zinc-400 transition-colors"
                            >
                              @{author?.username ?? 'unknown'}
                            </Link>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Use case */}
                    {review.use_case && (
                      <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                        {review.use_case}
                      </p>
                    )}

                    {/* Pros / Cons */}
                    {(review.pros || review.cons) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-800">
                        {review.pros && (
                          <div>
                            <p className="text-xs font-medium text-emerald-500 mb-1">Pros</p>
                            <p className="text-xs text-zinc-500 leading-relaxed">{review.pros}</p>
                          </div>
                        )}
                        {review.cons && (
                          <div>
                            <p className="text-xs font-medium text-red-500 mb-1">Cons</p>
                            <p className="text-xs text-zinc-500 leading-relaxed">{review.cons}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-3">
                        {review.experience_level && (
                          <span className="text-[11px] text-zinc-600 capitalize">{review.experience_level}</span>
                        )}
                        <span className="text-[11px] text-zinc-700">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-600">
                        <MessageSquare className="h-3 w-3" />
                        <span>{review.upvotes ?? 0} helpful</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/reviews?page=${page - 1}`}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/reviews?page=${page + 1}`}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
