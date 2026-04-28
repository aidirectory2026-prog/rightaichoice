'use client'

import { useActionState, useState } from 'react'
import { submitReply } from '@/actions/discussions'
import { useAuth } from '@/components/providers/auth-provider'
import { useAuthHref } from '@/lib/hooks/use-auth-href'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export function ReplyForm({ discussionId }: { discussionId: string }) {
  const { user } = useAuth()
  const loginHref = useAuthHref('/login')
  const [state, action, isPending] = useActionState(submitReply, null)
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <p className="text-xs text-zinc-500">
        <Link
          href={loginHref}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Sign in
        </Link>{' '}
        to reply
      </p>
    )
  }

  if (state?.success) {
    return (
      <p className="text-xs text-emerald-400">{state.success}</p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Reply
      </button>
    )
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="discussion_id" value={discussionId} />
      <textarea
        name="body"
        rows={2}
        required
        minLength={5}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
        placeholder="Write a reply..."
        autoFocus
      />
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Posting...' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
