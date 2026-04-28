'use client'

import { useActionState, useState } from 'react'
import { Star } from 'lucide-react'
import { submitReview } from '@/actions/reviews'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import Link from 'next/link'

export function ReviewForm({ toolId }: { toolId: string }) {
  const { user } = useAuth()
  const loginHref = useAuthHref('/login')
  const [state, action, isPending] = useActionState(submitReview, null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          <Link href={loginHref} className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign in
          </Link>{' '}
          to write a review
        </p>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-6 text-center">
        <p className="text-sm text-emerald-400">{state.success}</p>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
      <input type="hidden" name="tool_id" value={toolId} />
      <input type="hidden" name="rating" value={rating} />

      <h3 className="text-base font-semibold text-white">Write a Review</h3>

      {/* Star Rating */}
      <div>
        <label className="block text-sm text-zinc-400 mb-2">Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-zinc-700'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-zinc-500">{rating}/5</span>
          )}
        </div>
      </div>

      {/* Pros */}
      <div>
        <label htmlFor="pros" className="block text-sm text-zinc-400 mb-1">
          Pros <span className="text-zinc-600">(what you liked)</span>
        </label>
        <textarea
          id="pros"
          name="pros"
          rows={3}
          required
          minLength={10}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="What did you like about this tool?"
        />
      </div>

      {/* Cons */}
      <div>
        <label htmlFor="cons" className="block text-sm text-zinc-400 mb-1">
          Cons <span className="text-zinc-600">(what could be better)</span>
        </label>
        <textarea
          id="cons"
          name="cons"
          rows={3}
          required
          minLength={10}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="What could be improved?"
        />
      </div>

      {/* Use Case */}
      <div>
        <label htmlFor="use_case" className="block text-sm text-zinc-400 mb-1">
          Use Case <span className="text-zinc-600">(how you used it)</span>
        </label>
        <textarea
          id="use_case"
          name="use_case"
          rows={2}
          required
          minLength={10}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="Describe your use case..."
        />
      </div>

      {/* Skill Level */}
      <div>
        <label htmlFor="skill_level" className="block text-sm text-zinc-400 mb-1">
          Your Experience Level
        </label>
        <select
          id="skill_level"
          name="skill_level"
          required
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        >
          <option value="">Select your level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
