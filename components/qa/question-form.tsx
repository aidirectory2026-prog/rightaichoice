'use client'

import { useActionState } from 'react'
import { submitQuestion } from '@/actions/questions'
import { useAuth } from '@/components/providers/auth-provider'
import Link from 'next/link'

export function QuestionForm({ toolId }: { toolId: string }) {
  const { user } = useAuth()
  const [state, action, isPending] = useActionState(submitQuestion, null)

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Sign in
          </Link>{' '}
          to ask a question
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
    <form
      action={action}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4"
    >
      <input type="hidden" name="tool_id" value={toolId} />

      <h3 className="text-base font-semibold text-white">Ask a Question</h3>

      <div>
        <label htmlFor="q-title" className="block text-sm text-zinc-400 mb-1">
          Question title
        </label>
        <input
          id="q-title"
          name="title"
          type="text"
          required
          minLength={10}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          placeholder="e.g. How do I use this for automating email workflows?"
        />
      </div>

      <div>
        <label htmlFor="q-body" className="block text-sm text-zinc-400 mb-1">
          Details{' '}
          <span className="text-zinc-600">(context, what you've tried)</span>
        </label>
        <textarea
          id="q-body"
          name="body"
          rows={4}
          required
          minLength={20}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          placeholder="Describe your question in detail..."
        />
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Posting...' : 'Post Question'}
      </button>
    </form>
  )
}
