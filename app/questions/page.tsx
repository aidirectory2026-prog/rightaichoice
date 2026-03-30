import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { QuestionList } from '@/components/qa/question-list'
import { getRecentQuestions, getQuestionVotes } from '@/lib/data/questions'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Community Q&A — RightAIChoice',
  description:
    'Ask questions about AI tools and get answers from real users. Use-case driven Q&A for the AI community.',
}

type PageProps = {
  searchParams: Promise<{
    page?: string
    answered?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

const ANSWERED_OPTIONS = [
  { value: 'all', label: 'All questions' },
  { value: 'yes', label: 'Answered' },
  { value: 'no', label: 'Unanswered' },
] as const

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most voted' },
] as const

export default async function QuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const answered = (sp.answered ?? 'all') as 'yes' | 'no' | 'all'
  const sort = (sp.sort ?? 'newest') as 'newest' | 'popular'

  const { questions, total } = await getRecentQuestions(PAGE_SIZE, offset, {
    answered: answered === 'all' ? undefined : answered,
    sort,
  })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const questionIds = questions.map((q: { id: string }) => q.id)
  const userVotes = user ? await getQuestionVotes(questionIds, user.id) : {}

  // Build URL helper preserving current filters
  function filterUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (answered !== 'all') params.set('answered', answered)
    if (sort !== 'newest') params.set('sort', sort)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    const qs = params.toString()
    return `/questions${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-400" />
                Community Q&A
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {total.toLocaleString()} question{total !== 1 ? 's' : ''} from real users
              </p>
            </div>
            {user && (
              <Link
                href="/questions/ask"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Ask a question
              </Link>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-zinc-800">
            {/* Answered filter */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
              {ANSWERED_OPTIONS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={filterUrl({ answered: value === 'all' ? '' : value, page: '' })}
                  className={[
                    'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    answered === value || (value === 'all' && answered === 'all')
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {value === 'yes' && <CheckCircle className="h-3 w-3 text-emerald-400" />}
                  {label}
                </Link>
              ))}
            </div>

            {/* Sort filter */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 ml-auto">
              {SORT_OPTIONS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={filterUrl({ sort: value === 'newest' ? '' : value, page: '' })}
                  className={[
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    sort === value
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Question list */}
          <QuestionList
            questions={questions}
            userVotes={userVotes}
            showTool={true}
          />

          {questions.length === 0 && (
            <div className="py-16 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">
                No questions match your filters.{' '}
                <Link href="/questions" className="text-emerald-400 hover:text-emerald-300">
                  Clear filters
                </Link>
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={filterUrl({ page: String(page - 1) })}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={filterUrl({ page: String(page + 1) })}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
