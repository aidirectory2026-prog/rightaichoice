'use client'

import { useState, useTransition } from 'react'
import { Bookmark, Check, LogIn } from 'lucide-react'
import { saveStack } from '@/actions/stacks'

type SaveStackButtonProps = {
  title: string
  goal: string
  description?: string
  stages: unknown[]
  summary?: Record<string, unknown>
  source: 'planner' | 'curated' | 'custom'
  sourceSlug?: string
  isLoggedIn: boolean
}

export function SaveStackButton({
  title,
  goal,
  description,
  stages,
  summary,
  source,
  sourceSlug,
  isLoggedIn,
}: SaveStackButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  function handleSave() {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }

    startTransition(async () => {
      const result = await saveStack({
        title,
        goal,
        description,
        stages,
        summary,
        source,
        sourceSlug,
      })

      if (result.id) {
        setSaved(true)
        setSavedId(result.id)
      }
    })
  }

  if (saved && savedId) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Saved
        </span>
        <a
          href={`/stacks/saved/${savedId}`}
          className="text-xs text-zinc-400 hover:text-white underline transition-colors"
        >
          View
        </a>
      </div>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
    >
      {!isLoggedIn ? (
        <>
          <LogIn className="h-3.5 w-3.5" />
          Log in to save
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Stack'}
        </>
      )}
    </button>
  )
}
