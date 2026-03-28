'use client'

import { useState, useTransition } from 'react'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { voteOnReview } from '@/actions/reviews'
import { useRouter } from 'next/navigation'

export function ReviewVoteButton({
  reviewId,
  upvotes,
  downvotes,
  initialVote,
}: {
  reviewId: string
  upvotes: number
  downvotes: number
  initialVote: 'up' | 'down' | null
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [currentVote, setCurrentVote] = useState(initialVote)
  const [counts, setCounts] = useState({ up: upvotes, down: downvotes })
  const [isPending, startTransition] = useTransition()

  function handleVote(direction: 'up' | 'down') {
    if (!user) {
      router.push('/login')
      return
    }

    // Optimistic update
    const prevVote = currentVote
    const prevCounts = { ...counts }

    let newUp = counts.up
    let newDown = counts.down

    if (prevVote === direction) {
      // Undo
      if (direction === 'up') newUp--
      else newDown--
      setCurrentVote(null)
    } else {
      if (prevVote) {
        // Switch
        if (prevVote === 'up') newUp--
        else newDown--
      }
      if (direction === 'up') newUp++
      else newDown++
      setCurrentVote(direction)
    }

    setCounts({ up: Math.max(0, newUp), down: Math.max(0, newDown) })

    startTransition(async () => {
      const result = await voteOnReview(reviewId, direction)
      if (result.error) {
        // Revert on error
        setCurrentVote(prevVote)
        setCounts(prevCounts)
      }
    })
  }

  const score = counts.up - counts.down

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote('up')}
        disabled={isPending}
        className={`p-1 rounded transition-colors ${
          currentVote === 'up'
            ? 'text-emerald-400'
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
        title="Helpful"
      >
        <ArrowBigUp className={`h-5 w-5 ${currentVote === 'up' ? 'fill-emerald-400' : ''}`} />
      </button>
      <span className={`text-xs font-medium min-w-[1.5rem] text-center ${
        score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-zinc-600'
      }`}>
        {score}
      </span>
      <button
        onClick={() => handleVote('down')}
        disabled={isPending}
        className={`p-1 rounded transition-colors ${
          currentVote === 'down'
            ? 'text-red-400'
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
        title="Not helpful"
      >
        <ArrowBigDown className={`h-5 w-5 ${currentVote === 'down' ? 'fill-red-400' : ''}`} />
      </button>
    </div>
  )
}
