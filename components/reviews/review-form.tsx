'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { submitReview } from '@/actions/reviews'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'

export function ReviewForm({ toolId, toolSlug }: { toolId: string; toolSlug?: string }) {
  const { user } = useAuth()
  const loginHref = useAuthHref('/login')
  const [state, action, isPending] = useActionState(submitReview, null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  // Phase 8.g.2 — engagement timing + full-payload capture on success.
  const mountedAtRef = useRef<number>(0)
  const ratingSetAtRef = useRef<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const submittedRef = useRef(false)

  // Fire review_form_opened once on mount when authed (user sees the form).
  useEffect(() => {
    if (!user || mountedAtRef.current) return
    mountedAtRef.current = Date.now()
    analytics.reviewFormOpened(toolId, toolSlug ?? '', 'tool_page')
  }, [user, toolId, toolSlug])

  // After submit succeeds, fire reviewSubmittedRich with the full text payload.
  useEffect(() => {
    if (!state?.success || submittedRef.current) return
    submittedRef.current = true
    // Read final form values from the controlled-ish DOM at submit time.
    const fd = formRef.current ? new FormData(formRef.current) : null
    const pros = String(fd?.get('pros') ?? '')
    const cons = String(fd?.get('cons') ?? '')
    const useCase = String(fd?.get('use_case') ?? '')
    const fullText = [pros, cons, useCase].filter(Boolean).join('\n\n')
    analytics.reviewSubmittedRich({
      tool_id: toolId,
      tool_slug: toolSlug ?? '',
      rating,
      text: fullText,
      pros_text: pros,
      cons_text: cons,
      recommended: rating >= 4,
      use_case_tag: useCase.slice(0, 80),
      time_to_submit_ms: mountedAtRef.current ? Date.now() - mountedAtRef.current : 0,
    })
  }, [state, toolId, toolSlug, rating])

  function handleStarClick(star: number) {
    setRating(star)
    const now = Date.now()
    analytics.reviewRatingSet(toolId, star, ratingSetAtRef.current ? now - ratingSetAtRef.current : now - mountedAtRef.current)
    ratingSetAtRef.current = now
  }

  // Phase 8.g.11.a — wire reviewTextChanged on each textarea, debounced 2s so
  // we capture engagement signal (length + word_count) without per-keystroke
  // noise. Fires once per pause across the 3 textareas (pros/cons/use_case).
  const textChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleTextChange(_field: 'pros' | 'cons' | 'use_case') {
    if (textChangeTimerRef.current) clearTimeout(textChangeTimerRef.current)
    textChangeTimerRef.current = setTimeout(() => {
      const fd = formRef.current ? new FormData(formRef.current) : null
      const combined = ['pros', 'cons', 'use_case']
        .map((k) => String(fd?.get(k) ?? ''))
        .join(' ')
      const length = combined.length
      const wordCount = combined.trim() ? combined.trim().split(/\s+/).length : 0
      analytics.reviewTextChanged(toolId, length, wordCount)
    }, 2000)
  }

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
    <form ref={formRef} action={action} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
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
              onClick={() => handleStarClick(star)}
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
          onChange={() => handleTextChange('pros')}
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
          onChange={() => handleTextChange('cons')}
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
          onChange={() => handleTextChange('use_case')}
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
