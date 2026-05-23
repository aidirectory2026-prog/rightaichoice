'use client'

// Phase 8.g.11.e (2026-05-23) — live stream of user_events INSERT via
// Supabase Realtime. Mounted on /admin/insights as the headline tile.
//
// Subscribes to postgres_changes INSERT on public.user_events filtered
// to bot_likely=false. New rows prepend to a rolling 20-event list and
// increment a 60-second rolling count. Closes the channel on unmount.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Activity, Pause, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LiveEvent {
  id: string
  created_at: string
  event_name: string
  distinct_id: string
  page_path: string | null
  country: string | null
  bot_likely: boolean
}

const MAX_VISIBLE = 20
const ROLLING_WINDOW_MS = 60_000

function fmtAgo(ms: number): string {
  if (ms < 1000) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export function LiveEventsTicker({ filterDistinctId }: { filterDistinctId?: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(Date.now())
  const pausedRef = useRef(false)
  pausedRef.current = paused

  // Tick to update relative timestamps
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('user_events:admin-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_events',
        },
        (payload) => {
          if (pausedRef.current) return
          const row = payload.new as LiveEvent
          // Default-exclude bot events from the live view
          if (row.bot_likely) return
          // Optional distinct_id filter (per-user timeline subscriber)
          if (filterDistinctId && row.distinct_id !== filterDistinctId) return
          setEvents((prev) => [row, ...prev].slice(0, MAX_VISIBLE))
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filterDistinctId])

  // Rolling 60-second count
  const rollingCount = events.filter((e) => now - new Date(e.created_at).getTime() < ROLLING_WINDOW_MS).length

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="h-4 w-4 text-emerald-400" />
            {connected && !paused && (
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            )}
          </div>
          <div className="text-sm font-medium text-zinc-200">Live event stream</div>
          <div className="text-xs text-zinc-500">
            {connected ? (
              <>
                {rollingCount} in last 60s
                {filterDistinctId && ' · filtered to this user'}
              </>
            ) : (
              'connecting…'
            )}
          </div>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          Waiting for events…
        </div>
      ) : (
        <ul className="space-y-1">
          {events.map((e) => {
            const ago = now - new Date(e.created_at).getTime()
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded bg-zinc-950 px-2 py-1.5 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-emerald-300">{e.event_name}</span>
                  {e.page_path && (
                    <span className="truncate text-zinc-500" title={e.page_path}>
                      {e.page_path}
                    </span>
                  )}
                  {e.country && <span className="text-zinc-500">· {e.country}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/insights/user/${encodeURIComponent(e.distinct_id)}`}
                    className="font-mono text-[10px] text-zinc-500 hover:text-emerald-400"
                    title={e.distinct_id}
                  >
                    {e.distinct_id.length > 24 ? e.distinct_id.slice(0, 24) + '…' : e.distinct_id}
                  </Link>
                  <span className="text-[10px] text-zinc-600">{fmtAgo(ago)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
