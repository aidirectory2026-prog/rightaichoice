import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, MessageSquare, CheckCircle2 } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolLogo } from '@/components/tools/tool-logo'
import { AnswerList } from '@/components/qa/answer-list'
import { AnswerForm } from '@/components/qa/answer-form'
import { QuestionVoteButton } from '@/components/qa/question-vote-button'
import {
  getQuestionById,
  getAnswersForQuestion,
  getQuestionVotes,
  getAnswerVotes,
} from '@/lib/data/questions'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/utils'
import { ShareButton } from '@/components/shared/share-button'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const question = await getQuestionById(id)
  if (!question) return { title: 'Question Not Found' }

  const tool = question.tools as unknown as { name: string; slug: string }
  const description = question.body.slice(0, 155)

  return {
    title: `${question.title} — ${tool.name} Q&A`,
    description,
    keywords: [question.title, `${tool.name} question`, `${tool.name} help`, 'AI tools Q&A'],
    alternates: { canonical: `/questions/${id}` },
    openGraph: {
      title: `${question.title} — RightAIChoice`,
      description,
      url: `/questions/${id}`,
      type: 'article',
    },
  }
}

export default async function QuestionDetailPage({ params }: PageProps) {
  const { id } = await params
  const question = await getQuestionById(id)
  if (!question) notFound()

  const profile = question.profiles as unknown as {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
  const tool = question.tools as unknown as {
    id: string
    name: string
    slug: string
    logo_url: string | null
    website_url: string | null
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const answers = await getAnswersForQuestion(question.id)

  const emptyVotes: Record<string, 'up' | 'down'> = {}
  const [questionVotes, answerVotes] = await Promise.all([
    user ? getQuestionVotes([question.id], user.id) : Promise.resolve(emptyVotes),
    user
      ? getAnswerVotes(
          answers.map((a: { id: string }) => a.id),
          user.id
        )
      : Promise.resolve(emptyVotes),
  ])

  const acceptedAnswer = answers.find((a: { is_accepted: boolean }) => a.is_accepted)

  // Sanitize user content for safe JSON-LD embedding (prevents </script> injection)
  const sanitizeForJsonLd = (str: string) =>
    str.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    name: sanitizeForJsonLd(question.title),
    description: sanitizeForJsonLd(question.body.slice(0, 200)),
    mainEntity: {
      '@type': 'Question',
      name: sanitizeForJsonLd(question.title),
      text: sanitizeForJsonLd(question.body),
      datePublished: question.created_at,
      answerCount: answers.length,
      upvoteCount: question.upvotes,
      ...(acceptedAnswer && {
        acceptedAnswer: {
          '@type': 'Answer',
          text: sanitizeForJsonLd((acceptedAnswer as { body: string }).body),
          upvoteCount: (acceptedAnswer as { upvotes: number }).upvotes,
          datePublished: (acceptedAnswer as { created_at: string }).created_at,
        },
      }),
    },
  }

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link
              href="/questions"
              className="hover:text-white transition-colors"
            >
              Questions
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/tools/${tool.slug}`}
              className="hover:text-white transition-colors"
            >
              {tool.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-300 line-clamp-1">{question.title}</span>
          </nav>

          {/* Question */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex gap-4">
              {/* Vote */}
              <div className="shrink-0">
                <QuestionVoteButton
                  questionId={question.id}
                  upvotes={question.upvotes}
                  initialVote={questionVotes[question.id] ?? null}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {question.is_answered && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <h1 className="text-xl font-bold text-white">
                    {question.title}
                  </h1>
                </div>

                {/* Tool badge */}
                <Link
                  href={`/tools/${tool.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-600 transition-colors mt-2 mb-4"
                >
                  <ToolLogo
                    tool={tool}
                    size={14}
                    className="flex h-3.5 w-3.5 items-center justify-center rounded bg-zinc-800 overflow-hidden"
                    fallbackClassName="text-[8px] font-bold text-zinc-500"
                  />
                  {tool.name}
                </Link>

                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {question.body}
                </p>

                {/* Author + meta */}
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-600">
                  {profile && (
                    <Link
                      href={`/u/${profile.username}`}
                      className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 overflow-hidden">
                        {profile.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={profile.username}
                            width={20}
                            height={20}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[8px] font-bold text-zinc-500">
                            {profile.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {profile.username}
                    </Link>
                  )}
                  <span>Asked {timeAgo(question.created_at)}</span>
                  <div className="ml-auto">
                    <ShareButton
                      url={`/questions/${question.id}`}
                      title={question.title}
                      text={`${question.title} — answered on RightAIChoice`}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Answers section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
            </h2>

            <AnswerList
              answers={answers}
              userVotes={answerVotes}
              questionId={question.id}
              questionAuthorId={question.user_id}
              currentUserId={user?.id ?? null}
            />
          </div>

          {/* Answer form */}
          <div className="mt-6">
            <AnswerForm questionId={question.id} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
