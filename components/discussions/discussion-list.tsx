import { MessagesSquare } from 'lucide-react'
import { DiscussionCard } from '@/components/discussions/discussion-card'

type DiscussionData = {
  id: string
  tool_id: string
  user_id: string
  title: string
  body: string
  upvotes: number
  reply_count: number
  is_pinned: boolean
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
}

type ReplyData = {
  id: string
  discussion_id: string
  user_id: string
  body: string
  upvotes: number
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
}

export function DiscussionList({
  discussions,
  repliesMap,
  discussionVotes,
  replyVotes,
}: {
  discussions: DiscussionData[]
  repliesMap: Record<string, ReplyData[]>
  discussionVotes: Record<string, 'up' | 'down'>
  replyVotes: Record<string, 'up' | 'down'>
}) {
  if (discussions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <MessagesSquare className="mx-auto h-8 w-8 text-zinc-700 mb-2" />
        <p className="text-sm text-zinc-500">
          No discussions yet. Be the first to share a tip or start a conversation!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {discussions.map((d) => (
        <DiscussionCard
          key={d.id}
          discussion={d}
          replies={repliesMap[d.id] ?? []}
          discussionVote={discussionVotes[d.id] ?? null}
          replyVotes={replyVotes}
          expanded={true}
        />
      ))}
    </div>
  )
}
