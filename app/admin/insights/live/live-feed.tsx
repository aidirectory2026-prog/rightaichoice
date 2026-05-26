'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowUpRight, Globe2, Smartphone, Monitor, Tablet, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BigNumber, Card, EmptyState, countryFlag, relativeTime } from '../_ui/primitives'
import type { LiveSession, ActivityEvent } from './page'

const ACTIVE_WITHIN_SEC = 300 // 5-minute "live" window

export function LiveFeed({
  initialSessions, initialFeed,
}: {
  initialSessions: LiveSession[]
  initialFeed: ActivityEvent[]
}) {
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions)
  const [feed, setFeed] = useState<ActivityEvent[]>(initialFeed)
  const [lastTick, setLastTick] = useState<Date>(new Date())
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'polling'>('connecting')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function refresh() {
      const [{ data: s }, { data: f }] = await Promise.all([
        supabase.rpc('insights_live_sessions', { p_active_within_sec: ACTIVE_WITHIN_SEC, p_include_bots: false }),
        supabase.rpc('insights_activity_feed', { p_limit: 50, p_include_bots: false }),
      ])
      if (cancelled) return
      if (Array.isArray(s)) setSessions(s as LiveSession[])
      if (Array.isArray(f)) setFeed(f as ActivityEvent[])
      setLastTick(new Date())
    }

    // Supabase Realtime — subscribe to INSERTs on user_events for instant updates
    const channel = supabase
      .channel('live-insights')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_events' }, () => {
        refresh()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('polling')
      })

    // Polling fallback — 5s. Works regardless of Realtime, doubles as a watchdog
    // for the "seconds since last event" timers to advance even without inserts.
    const pollId = setInterval(refresh, 5_000)

    return () => {
      cancelled = true
      clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [])

  // Ticking clock — re-render once per second so the "Xs ago" times stay fresh
  // even when no new events arrive.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const activeNow = useMemo(() => sessions.filter((s) => s.seconds_since_last < 60), [sessions])
  const countriesNow = useMemo(() => new Set(sessions.map((s) => s.country).filter(Boolean)).size, [sessions])
  const toolViewsNow = useMemo(() => sessions.filter((s) => s.current_page?.startsWith('/tools/')).length, [sessions])

  return (
    <div className="space-y-6">
      {/* Top strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigNumber label="Active now" value={activeNow.length} hint="<1 min since last event" tone="good" />
        <BigNumber label="Online (5 min)" value={sessions.length} hint="Live sessions" />
        <BigNumber label="Countries" value={countriesNow} hint="Distinct locations" tone="accent" />
        <BigNumber label="On tool pages" value={toolViewsNow} hint="Reading a tool right now" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Active sessions table */}
        <Card
          title="Active sessions"
          subtitle={`Updated ${relativeTime(lastTick)} · ${ACTIVE_WITHIN_SEC / 60}-min window`}
          action={
            <div className="flex items-center gap-1.5 text-[10px] font-medium">
              {realtimeStatus === 'live' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                  <Wifi className="h-3 w-3" /> Realtime
                </span>
              ) : realtimeStatus === 'polling' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-800 bg-amber-950/60 px-2 py-0.5 text-amber-300">
                  <WifiOff className="h-3 w-3" /> Polling 5s
                </span>
              ) : (
                <span className="text-zinc-500">Connecting…</span>
              )}
            </div>
          }
        >
          {sessions.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-8 w-8" />}
              title="No one online right now"
              hint="The page will update automatically when a visitor lands."
            />
          ) : (
            <SessionList sessions={sessions} />
          )}
        </Card>

        {/* Right rail — activity feed */}
        <Card title="Activity feed" subtitle="Last 50 meaningful events">
          {feed.length === 0 ? (
            <EmptyState icon={<Activity className="h-8 w-8" />} title="No recent activity" />
          ) : (
            <ActivityList feed={feed} />
          )}
        </Card>
      </div>
    </div>
  )
}

function deviceIcon(t: string | null) {
  if (t === 'mobile') return <Smartphone className="h-3 w-3" />
  if (t === 'tablet') return <Tablet className="h-3 w-3" />
  if (t === 'desktop') return <Monitor className="h-3 w-3" />
  return <Globe2 className="h-3 w-3" />
}

function SessionList({ sessions }: { sessions: LiveSession[] }) {
  return (
    <ul className="divide-y divide-zinc-800/60">
      {sessions.map((s) => (
        <li key={s.distinct_id} className="flex items-center gap-3 py-2.5 group">
          <div className="text-lg leading-none w-6 text-center" title={s.country ?? 'unknown'}>{countryFlag(s.country)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`relative flex h-1.5 w-1.5 shrink-0 ${s.seconds_since_last < 60 ? '' : 'opacity-40'}`}>
                {s.seconds_since_last < 60 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.seconds_since_last < 60 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </span>
              <div className="text-xs text-zinc-200 font-medium truncate" title={s.current_page ?? ''}>
                {s.current_page || '(unknown page)'}
              </div>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-0.5">
                {deviceIcon(s.device_type)} {s.device_type ?? 'unknown'}
              </span>
              <span>·</span>
              <span>{s.city || s.region || s.country || '—'}</span>
              <span>·</span>
              <span title={s.current_event}>{s.events_in_window} events</span>
              <span>·</span>
              <span>{s.pages_in_window} pages</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xs font-mono tabular-nums ${s.seconds_since_last < 60 ? 'text-emerald-300' : 'text-zinc-500'}`}>
              {s.seconds_since_last < 60 ? `${s.seconds_since_last}s` : relativeTime(s.last_event_at)}
            </div>
            <Link
              href={`/admin/insights/journey/${encodeURIComponent(s.distinct_id)}`}
              className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              Journey <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActivityList({ feed }: { feed: ActivityEvent[] }) {
  return (
    <ul className="space-y-2 max-h-[600px] overflow-y-auto -mr-4 pr-4">
      {feed.map((e) => (
        <li key={e.id} className="text-xs text-zinc-300 leading-relaxed">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] text-zinc-500 shrink-0">{relativeTime(e.created_at)}</span>
            <span className="text-[10px] text-zinc-600">{countryFlag(e.country)}{e.city || e.country || ''}</span>
          </div>
          <div className="mt-0.5">
            <Link
              href={`/admin/insights/journey/${encodeURIComponent(e.distinct_id)}`}
              className="text-zinc-500 hover:text-emerald-400 font-mono text-[10px]"
            >
              {e.distinct_id.slice(0, 12)}…
            </Link>
            <span className="ml-1.5 text-emerald-400 font-medium">{e.event_name}</span>
            {e.page_path && <span className="ml-1 text-zinc-500 truncate">on {e.page_path}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
