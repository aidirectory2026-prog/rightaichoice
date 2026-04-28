'use client'

import { useState, useTransition } from 'react'
import { ArrowBigUp } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import { voteOnQuestion } from '@/actions/questions'
import { useRouter } from 'next/navigation'

export function QuestionVoteButton({
  questionId,
  upvotes,
  initialVote,
}: {
  questionId: string
  upvotes: number
  initialVote: 'up' | 'down' | null
}) {
  const { user } = useAuth()
  const router = useRouter()
  // Phase 7 Step 58 (BUG-019): hook must run at top of component, not inside
  // the click handler. Cache the result and push to it on click.
  const loginHref = useAuthHref('/login')
  const [currentVote, setCurrentVote] = useState(initialVote)
  const [count, setCount] = useState(upvotes)
  const [isPending, startTransition] = useTransition()

  function handleVote() {
    if (!user) {
      router.push(loginHref)
      return
    }

    const prevVote = currentVote
    const prevCount = count

    if (currentVote === 'up') {
      setCurrentVote(null)
      setCount(Math.max(0, count - 1))
    } else {
      setCurrentVote('up')
      setCount(count + 1)
    }

    startTransition(async () => {
      const result = await voteOnQuestion(questionId, 'up')
      if (result.error) {
        setCurrentVote(prevVote)
        setCount(prevCount)
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={handleVote}
        disabled={isPending}
        className={`p-1 rounded transition-colors ${
          currentVote === 'up'
            ? 'text-emerald-400'
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
        title="Upvote"
      >
        <ArrowBigUp
          className={`h-5 w-5 ${currentVote === 'up' ? 'fill-emerald-400' : ''}`}
        />
      </button>
      <span
        className={`text-xs font-medium ${
          count > 0 ? 'text-emerald-400' : 'text-zinc-600'
        }`}
      >
        {count}
      </span>
    </div>
  )
}
