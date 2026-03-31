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
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-950/50 border border-purple-800/30">
          <MessagesSquare className="h-6 w-6 text-purple-400/70" />
        </div>
        <p className="text-sm font-medium text-zinc-300">No discussions yet</p>
        <p className="mt-1 text-xs text-zinc-500 max-w-xs mx-auto">
          Share a tip, workflow, or start a conversation about this tool.
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
