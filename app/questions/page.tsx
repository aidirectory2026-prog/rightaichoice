import type { Metadata } from 'next'
import { MessageSquare } from 'lucide-react'
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
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 20

export default async function QuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { questions, total } = await getRecentQuestions(PAGE_SIZE, offset)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const questionIds = questions.map((q: { id: string }) => q.id)
  const userVotes = user ? await getQuestionVotes(questionIds, user.id) : {}

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-400" />
              Community Q&A
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Questions about AI tools from real users. Ask anything, get
              answers from the community.
            </p>
          </div>

          {/* Question list */}
          <QuestionList
            questions={questions}
            userVotes={userVotes}
            showTool={true}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/questions?page=${page - 1}`}
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
                  href={`/questions?page=${page + 1}`}
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
