'use client'

import { useState, useTransition, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { toggleSave } from '@/actions/tools'
import { analytics } from '@/lib/analytics'
import { useRouter } from 'next/navigation'

export function SaveToolButton({
  toolId,
  toolName,
  toolSlug,
  initialSaved = false,
}: {
  toolId: string
  toolName?: string
  toolSlug?: string
  // Caching Layer 3 (fable-5): now optional. The tool page is statically
  // edge-cached and no longer resolves per-user saved-state server-side, so
  // this component fetches it on mount when the visitor is signed in.
  initialSaved?: boolean
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  // Resolve the real saved-state once auth is known (the cached page renders
  // the signed-out default). Anonymous users stay false. Aborts if unmounted.
  useEffect(() => {
    if (!user) return
    let active = true
    fetch(`/api/me/tool-state/${toolId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && typeof d.saved === 'boolean') setSaved(d.saved)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user, toolId])

  function handleClick() {
    if (!user) {
      // Journey-aware: return to this tool page after sign-in so the user can
      // finish the save they intended (not the generic /dashboard).
      const next = typeof window !== 'undefined' ? window.location.pathname : '/'
      router.push(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    // Optimistic update
    const prevSaved = saved
    setSaved(!saved)

    startTransition(async () => {
      const result = await toggleSave(toolId)
      if (result.error) {
        setSaved(prevSaved) // revert on error
      } else {
        setSaved(result.saved)
        if (result.saved) analytics.toolSaved(toolId, toolName ?? toolId, toolSlug)
        else analytics.toolUnsaved(toolId, toolName ?? toolId, toolSlug)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
        saved
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
          : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
      } disabled:opacity-50`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-emerald-400' : ''}`} />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
