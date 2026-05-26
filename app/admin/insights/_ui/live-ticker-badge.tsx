'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LiveTickerBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function fetchCount() {
      const { data } = await supabase.rpc('insights_live_sessions', {
        p_active_within_sec: 60,
        p_include_bots: false,
      })
      if (!cancelled) setCount(Array.isArray(data) ? data.length : 0)
    }

    fetchCount()
    const id = setInterval(fetchCount, 10_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (count === null) return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {count} live
    </span>
  )
}
