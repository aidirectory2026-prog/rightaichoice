'use client'

import { useState, useTransition } from 'react'
import { ArrowBigUp } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { voteOnReply } from '@/actions/discussions'
import { useRouter } from 'next/navigation'

export function ReplyVoteButton({
  replyId,
  upvotes,
  initialVote,
}: {
  replyId: string
  upvotes: number
  initialVote: 'up' | 'down' | null
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [currentVote, setCurrentVote] = useState(initialVote)
  const [count, setCount] = useState(upvotes)
  const [isPending, startTransition] = useTransition()

  function handleVote() {
    if (!user) {
      router.push('/login')
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
      const result = await voteOnReply(replyId, 'up')
      if (result.error) {
        setCurrentVote(prevVote)
        setCount(prevCount)
      }
    })
  }

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        currentVote === 'up'
          ? 'text-emerald-400'
          : 'text-zinc-600 hover:text-zinc-400'
      }`}
      title="Upvote"
    >
      <ArrowBigUp
        className={`h-4 w-4 ${currentVote === 'up' ? 'fill-emerald-400' : ''}`}
      />
      <span>{count}</span>
    </button>
  )
}
