'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Bookmark, Check, LogIn } from 'lucide-react'
import { saveStack } from '@/actions/stacks'
import { analytics } from '@/lib/analytics'

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
  const [error, setError] = useState<string | null>(null) // Phase 10 #31
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
          // Phase 8.g.11.a — wire stackSavedRich on auto-save-after-login.
          fireStackSavedRich(pending, result.id)
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

    setError(null)
    startTransition(async () => {
      const result = await saveStack(payload)
      if (result.id) {
        setSaved(true)
        setSavedId(result.id)
        fireStackSavedRich(payload, result.id)
      } else {
        // Phase 10 #31 — surface the failure instead of silently doing nothing.
        setError(result.error ?? 'Could not save — please try again.')
      }
    })
  }

  // BUG-36 (Phase 13): derive the tool list + estimated cost from the ACTUAL
  // stage shape `{ bestPick, alternatives }`. The old code read `stage.tools`,
  // a field that never exists on this payload (every call site — planner,
  // saved page, /stacks/[slug] — passes bestPick/alternatives), so it silently
  // fired stack_saved with EMPTY tool_slugs and $0 cost. tool_slugs now records
  // every persisted tool (best pick + its alternatives); the headline cost sums
  // the chosen BEST PICKS only — alternatives are swap options, not extra spend.
  function fireStackSavedRich(payload: SaveStackPayload, stackSlug: string) {
    type Pick = { slug?: string | null; pricing?: string | number | null }
    type Stage = { bestPick?: Pick | null; alternatives?: Pick[] | null }
    const stages = (payload.stages ?? []) as Stage[]

    const parsePrice = (p: unknown): number => {
      if (typeof p === 'number') return Number.isFinite(p) ? p : 0
      if (typeof p === 'string') {
        const n = parseFloat(p.replace(/[^\d.]/g, ''))
        return Number.isNaN(n) ? 0 : n
      }
      return 0
    }

    const bestPicks = stages.map((s) => s.bestPick).filter((b): b is Pick => !!b?.slug)
    const altSlugs = stages
      .flatMap((s) => (s.alternatives ?? []).map((a) => a?.slug))
      .filter((s): s is string => !!s)
    const tool_slugs = [...new Set([...bestPicks.map((b) => b.slug as string), ...altSlugs])]
    const total = bestPicks.reduce((sum, b) => sum + parsePrice(b.pricing), 0)

    analytics.stackSavedRich({
      stack_slug: stackSlug,
      stack_name: payload.title,
      tool_slugs,
      tool_ids: [], // this payload shape carries names/slugs/pricing, not ids
      total_estimated_cost_usd: Math.round(total),
      source: payload.source === 'curated' ? 'compare_page' : payload.source === 'planner' ? 'plan_flow' : 'manual_builder',
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
    <div className="flex flex-col gap-1">
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
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}
