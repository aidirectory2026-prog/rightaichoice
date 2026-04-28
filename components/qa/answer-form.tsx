'use client'

import { useActionState } from 'react'
import { submitAnswer } from '@/actions/questions'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import Link from 'next/link'

export function AnswerForm({ questionId }: { questionId: string }) {
  const { user } = useAuth()
  const loginHref = useAuthHref('/login')
  const [state, action, isPending] = useActionState(submitAnswer, null)

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
        <p className="text-sm text-zinc-400">
          <Link
            href={loginHref}
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Sign in
          </Link>{' '}
          to post an answer
        </p>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-5 text-center">
        <p className="text-sm text-emerald-400">{state.success}</p>
      </div>
    )
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
    >
      <input type="hidden" name="question_id" value={questionId} />

      <h3 className="text-base font-semibold text-white">Your Answer</h3>

      <div>
        <textarea
          name="body"
          rows={5}
          required
          minLength={20}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="Share your experience or solution..."
        />
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Posting...' : 'Post Answer'}
      </button>
    </form>
  )
}
