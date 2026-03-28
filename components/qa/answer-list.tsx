import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { AnswerVoteButton } from './answer-vote-button'
import { AcceptAnswerButton } from './accept-answer-button'
import { timeAgo } from '@/lib/utils'

type AnswerData = {
  id: string
  body: string
  upvotes: number
  is_accepted: boolean
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
}

type Props = {
  answers: AnswerData[]
  userVotes: Record<string, 'up' | 'down'>
  questionId: string
  questionAuthorId: string
  currentUserId: string | null
}

export function AnswerList({
  answers,
  userVotes,
  questionId,
  questionAuthorId,
  currentUserId,
}: Props) {
  if (answers.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-6">
        No answers yet. Be the first to help!
      </p>
    )
  }

  const isQuestionAuthor = currentUserId === questionAuthorId

  return (
    <div className="space-y-4">
      {answers.map((answer) => {
        const profile = answer.profiles as unknown as AnswerData['profiles']

        return (
          <div
            key={answer.id}
            className={`rounded-xl border p-4 ${
              answer.is_accepted
                ? 'border-emerald-800 bg-emerald-950/20'
                : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            <div className="flex gap-3">
              {/* Vote column */}
              <div className="flex flex-col items-center shrink-0 gap-1">
                <AnswerVoteButton
                  answerId={answer.id}
                  upvotes={answer.upvotes}
                  initialVote={userVotes[answer.id] ?? null}
                />
                {answer.is_accepted && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )}
                {isQuestionAuthor && !answer.is_accepted && (
                  <AcceptAnswerButton
                    answerId={answer.id}
                    questionId={questionId}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {answer.body}
                </p>

                {/* Meta */}
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600">
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
                      {(profile.reputation ?? 0) >= 100 && (
                        <span className="text-emerald-600">Trusted</span>
                      )}
                    </Link>
                  )}
                  <span>{timeAgo(answer.created_at)}</span>
                  {answer.is_accepted && (
                    <span className="text-emerald-400 font-medium">
                      Accepted answer
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
