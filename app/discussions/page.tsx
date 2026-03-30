import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { getRecentDiscussions } from '@/lib/data/discussions'

export const metadata: Metadata = {
  title: 'Discussions — RightAIChoice',
  description: 'Community discussions about AI tools — tips, workflows, comparisons, and real-world use cases.',
}

type PageProps = {
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 20

export default async function DiscussionsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { discussions, total } = await getRecentDiscussions(PAGE_SIZE, offset)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-purple-400" />
              Discussions
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Tips, workflows, comparisons, and real-world use cases from the community.
            </p>
          </div>

          {/* Discussions list */}
          {discussions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <MessageCircle className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">No discussions yet. Start the conversation on any tool page.</p>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Browse tools
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion) => {
                const tool = discussion.tools as unknown as { id: string; name: string; slug: string; logo_url: string | null }
                const author = discussion.profiles as unknown as { id: string; username: string; avatar_url: string | null; reputation: number }
                return (
                  <div key={discussion.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 mt-0.5">
                        {tool?.name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white mb-0.5 leading-snug">
                          {discussion.title}
                        </p>
                        <p className="text-xs text-zinc-600">
                          in{' '}
                          <Link
                            href={`/tools/${tool?.slug ?? ''}`}
                            className="text-zinc-500 hover:text-emerald-400 transition-colors"
                          >
                            {tool?.name ?? 'Unknown Tool'}
                          </Link>
                          {' · '}
                          by{' '}
                          <Link
                            href={`/u/${author?.username ?? ''}`}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            @{author?.username ?? 'unknown'}
                          </Link>
                        </p>

                        {discussion.body && (
                          <p className="mt-2 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                            {discussion.body}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-xs text-zinc-600">
                            <MessageCircle className="h-3 w-3" />
                            {discussion.reply_count ?? 0} replies
                          </span>
                          <span className="text-xs text-zinc-700">
                            {new Date(discussion.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
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
                  href={`/discussions?page=${page - 1}`}
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
                  href={`/discussions?page=${page + 1}`}
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
