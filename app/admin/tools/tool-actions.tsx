'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { deleteTool, toggleToolPublished, markToolVerified, awardToolCreatorBadge, revokeToolCreatorBadge } from '@/actions/tools'

export function ToolActions({ id, slug, name, isPublished, submittedBy, hasBadge }: {
  id: string
  slug: string
  name: string
  isPublished: boolean
  submittedBy?: string | null
  hasBadge?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(() => { deleteTool(id) })
  }

  function handleToggle() {
    startTransition(() => { toggleToolPublished(id, !isPublished) })
  }

  function handleVerify() {
    startTransition(() => { markToolVerified(id) })
  }

  function handleBadgeToggle() {
    if (!submittedBy) return
    startTransition(() => {
      if (hasBadge) {
        revokeToolCreatorBadge(submittedBy)
      } else {
        awardToolCreatorBadge(submittedBy)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/tools/${id}/stats`}
        className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
      >
        Stats
      </Link>
      <button
        onClick={handleVerify}
        disabled={isPending}
        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 disabled:opacity-50"
      >
        Verify
      </button>
      {submittedBy && (
        <button
          onClick={handleBadgeToggle}
          disabled={isPending}
          className={`text-xs transition-colors px-2 py-1 disabled:opacity-50 ${
            hasBadge ? 'text-cyan-400 hover:text-cyan-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {hasBadge ? 'Revoke Badge' : 'Award Badge'}
        </button>
      )}
      <Link
        href={`/admin/tools/${id}`}
        className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
      >
        Edit
      </Link>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 disabled:opacity-50"
      >
        {isPublished ? 'Unpublish' : 'Publish'}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  )
}
