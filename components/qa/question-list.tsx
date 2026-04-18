import Link from 'next/link'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import { QuestionVoteButton } from './question-vote-button'
import { ToolLogo } from '@/components/tools/tool-logo'
import { timeAgo } from '@/lib/utils'

type QuestionData = {
  id: string
  title: string
  body: string
  upvotes: number
  answer_count: number
  is_answered: boolean
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
  tools?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    website_url?: string | null
  } | null
}

type Props = {
  questions: QuestionData[]
  userVotes: Record<string, 'up' | 'down'>
  showTool?: boolean
}

export function QuestionList({ questions, userVotes, showTool = false }: Props) {
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-950/50 border border-blue-800/30">
          <MessageSquare className="h-6 w-6 text-blue-400/70" />
        </div>
        <p className="text-sm font-medium text-zinc-300">No questions yet</p>
        <p className="mt-1 text-xs text-zinc-500 max-w-xs mx-auto">
          Have a question about this tool? Ask the community below.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => {
        const profile = q.profiles as unknown as QuestionData['profiles']
        const tool = q.tools as unknown as QuestionData['tools']

        return (
          <div
            key={q.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex gap-3">
              {/* Vote column */}
              <div className="flex flex-col items-center shrink-0">
                <QuestionVoteButton
                  questionId={q.id}
                  upvotes={q.upvotes}
                  initialVote={userVotes[q.id] ?? null}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {q.is_answered && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <Link
                    href={`/questions/${q.id}`}
                    className="text-sm font-medium text-white hover:text-emerald-400 transition-colors line-clamp-1"
                  >
                    {q.title}
                  </Link>
                </div>

                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                  {q.body}
                </p>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                  {showTool && tool && (
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors"
                    >
                      <ToolLogo
                        tool={tool}
                        size={14}
                        className="flex h-3.5 w-3.5 items-center justify-center rounded bg-zinc-800 overflow-hidden"
                        fallbackClassName="text-[8px] font-bold text-zinc-500"
                      />
                      {tool.name}
                    </Link>
                  )}
                  {profile && (
                    <Link
                      href={`/u/${profile.username}`}
                      className="hover:text-zinc-400 transition-colors"
                    >
                      {profile.username}
                    </Link>
                  )}
                  <span>{timeAgo(q.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
