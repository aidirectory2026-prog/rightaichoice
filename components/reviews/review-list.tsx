import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { ReviewVoteButton } from './review-vote-button'
import { timeAgo } from '@/lib/utils'

type ReviewData = {
  id: string
  rating: number
  pros: string
  cons: string
  use_case: string
  skill_level: string
  upvotes: number
  downvotes: number
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    reputation: number
  } | null
}

type Props = {
  reviews: ReviewData[]
  userVotes: Record<string, 'up' | 'down'>
}

const skillLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function ReviewList({ reviews, userVotes }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <Star className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No reviews yet. Be the first to share your experience!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const profile = review.profiles as unknown as ReviewData['profiles']
        return (
          <div
            key={review.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            {/* Header: User + Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 overflow-hidden">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-zinc-500">
                      {profile?.username?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                <div>
                  {profile ? (
                    <Link
                      href={`/u/${profile.username}`}
                      className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                    >
                      {profile.username}
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-500">Anonymous</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <span>{skillLabels[review.skill_level] ?? review.skill_level}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(review.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-emerald-500 mb-1">Pros</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{review.pros}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-red-400 mb-1">Cons</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{review.cons}</p>
              </div>
            </div>

            {/* Use case */}
            <div className="mt-3">
              <p className="text-xs font-medium text-blue-400 mb-1">Use Case</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{review.use_case}</p>
            </div>

            {/* Footer: Vote */}
            <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
              <ReviewVoteButton
                reviewId={review.id}
                upvotes={review.upvotes}
                downvotes={review.downvotes}
                initialVote={userVotes[review.id] ?? null}
              />
              {(profile?.reputation ?? 0) >= 100 && (
                <span className="text-xs text-zinc-600 border border-zinc-800 rounded-full px-2 py-0.5">
                  Trusted Reviewer
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
