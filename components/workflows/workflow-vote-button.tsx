'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp } from 'lucide-react'
import { voteOnWorkflowAction } from '@/actions/workflows'

type Props = {
  workflowId: string
  initialUpvotes: number
  initialVoted: boolean
}

export function WorkflowVoteButton({ workflowId, initialUpvotes, initialVoted }: Props) {
  const [voted, setVoted] = useState(initialVoted)
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [isPending, startTransition] = useTransition()

  function handleVote() {
    // Optimistic update
    const nextVoted = !voted
    setVoted(nextVoted)
    setUpvotes((prev) => prev + (nextVoted ? 1 : -1))

    startTransition(async () => {
      try {
        await voteOnWorkflowAction(workflowId)
      } catch {
        // Revert on error
        setVoted(voted)
        setUpvotes(initialUpvotes)
      }
    })
  }

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        voted
          ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400'
          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
      }`}
    >
      <ThumbsUp className={`h-4 w-4 ${voted ? 'fill-emerald-400' : ''}`} />
      {upvotes} {upvotes === 1 ? 'upvote' : 'upvotes'}
    </button>
  )
}
