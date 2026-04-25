'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Bookmark, Check, LogIn } from 'lucide-react'
import { saveStack } from '@/actions/stacks'

const PENDING_KEY = 'pending_stack_save_v1'

type SaveStackPayload = {
  title: string
  goal: string
  description?: string
  stages: unknown[]
  summary?: Record<string, unknown>
  source: 'planner' | 'curated' | 'custom'
  sourceSlug?: string
}

type SaveStackButtonProps = SaveStackPayload & {
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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const autoSaveAttempted = useRef(false)

  // If the user just returned from login with a pending stack in sessionStorage,
  // finish the save automatically so they don't have to click again.
  useEffect(() => {
    if (!isLoggedIn || autoSaveAttempted.current) return
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return
    autoSaveAttempted.current = true
    sessionStorage.removeItem(PENDING_KEY)
    try {
      const pending = JSON.parse(raw) as SaveStackPayload
      startTransition(async () => {
        const result = await saveStack(pending)
        if (result.id) {
          setSaved(true)
          setSavedId(result.id)
        }
      })
    } catch {
      // corrupt payload — silently drop
    }
  }, [isLoggedIn])

  function handleSave() {
    const payload: SaveStackPayload = {
      title,
      goal,
      description,
      stages,
      summary,
      source,
      sourceSlug,
    }

    if (!isLoggedIn) {
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload))
      } catch {
        // storage full or disabled — fall back to just redirecting
      }
      const query = searchParams.toString()
      const currentUrl = pathname + (query ? `?${query}` : '')
      window.location.href = `/login?next=${encodeURIComponent(currentUrl)}`
      return
    }

    startTransition(async () => {
      const result = await saveStack(payload)
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 min-h-[40px] text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
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
