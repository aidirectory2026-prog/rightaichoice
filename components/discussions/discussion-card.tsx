import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, Pin } from 'lucide-react'
import { DiscussionVoteButton } from '@/components/discussions/discussion-vote-button'
import { ReplyVoteButton } from '@/components/discussions/reply-vote-button'
import { ReplyForm } from '@/components/discussions/reply-form'
import { timeAgo } from '@/lib/utils'

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

export function DiscussionCard({
  discussion,
  replies,
  discussionVote,
  replyVotes,
  expanded,
}: {
  discussion: DiscussionData
  replies: ReplyData[]
  discussionVote: 'up' | 'down' | null
  replyVotes: Record<string, 'up' | 'down'>
  expanded: boolean
}) {
  const profile = discussion.profiles

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex gap-3 p-4">
        {/* Vote */}
        <div className="shrink-0 pt-1">
          <DiscussionVoteButton
            discussionId={discussion.id}
            upvotes={discussion.upvotes}
            initialVote={discussionVote}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {discussion.is_pinned && (
              <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-white leading-snug">
              {discussion.title}
            </h3>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line line-clamp-3">
            {discussion.body}
          </p>

          {/* Meta */}
          <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-600">
            {profile && (
              <Link
                href={`/u/${profile.username}`}
                className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 overflow-hidden">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      width={16}
                      height={16}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[7px] font-bold text-zinc-500">
                      {profile.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {profile.username}
                {profile.reputation >= 100 && (
                  <span className="text-amber-500">Trusted</span>
                )}
              </Link>
            )}
            <span>{timeAgo(discussion.created_at)}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {discussion.reply_count}
            </span>
          </div>
        </div>
      </div>

      {/* Replies (expanded) */}
      {expanded && replies.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 px-4 py-3 space-y-3">
          {replies.map((reply) => {
            const rp = reply.profiles
            return (
              <div key={reply.id} className="flex gap-2.5 ml-8">
                <div className="shrink-0 pt-0.5">
                  <ReplyVoteButton
                    replyId={reply.id}
                    upvotes={reply.upvotes}
                    initialVote={replyVotes[reply.id] ?? null}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {reply.body}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-600">
                    {rp && (
                      <Link
                        href={`/u/${rp.username}`}
                        className="hover:text-zinc-400 transition-colors"
                      >
                        {rp.username}
                      </Link>
                    )}
                    <span>{timeAgo(reply.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reply form */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 ml-8">
          <ReplyForm discussionId={discussion.id} />
        </div>
      )}
    </div>
  )
}
