'use client'

// Phase 13 R2 — admin controls: bulk approve + per-platform pause/resume.

import { useState, useTransition } from 'react'
import { bulkApprove, setPlatformPaused } from '@/app/admin/social/actions'
import type { Platform } from '@/lib/social/types'

export function BulkApproveButton({ count }: { count: number }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  if (count === 0) return null
  return (
    <span className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await bulkApprove()
            setMsg(r.error ?? `approved ${r.approved ?? 0}`)
          })
        }
        className="rounded bg-emerald-700 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        Approve all {count}
      </button>
      {msg ? <span className="text-xs text-zinc-400">{msg}</span> : null}
    </span>
  )
}

export function PauseToggle({ platform, paused }: { platform: string; paused: boolean }) {
  const [pending, start] = useTransition()
  const [isPaused, setIsPaused] = useState(paused)
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setPlatformPaused(platform as Platform, !isPaused)
          if (!r.error) setIsPaused(!isPaused)
        })
      }
      className={`text-xs font-medium ${isPaused ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {isPaused ? 'paused · resume' : 'pause'}
    </button>
  )
}
