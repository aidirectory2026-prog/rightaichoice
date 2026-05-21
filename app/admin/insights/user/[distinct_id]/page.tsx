// Phase 8.g.8 (2026-05-21) — per-user timeline at
// /admin/insights/user/[distinct_id]. Shows every event one user fired,
// in chronological order, plus their full user_intent_profile (the
// salable per-user record).

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getEventsForDistinctId, getUserProfile, type RawEventRow, type UserProfile } from '../../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'User timeline — Admin' }

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').replace('Z', ' UTC')
}

function ArrayList({ label, items }: { label: string; items: string[] | null }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.slice(0, 30).map((item, i) => (
          <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
            {item}
          </span>
        ))}
        {items.length > 30 && (
          <span className="text-xs text-zinc-500">+{items.length - 30} more</span>
        )}
      </div>
    </div>
  )
}

function ProfileSection({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-500">
        No user_intent_profile row exists for this distinct_id yet.
      </div>
    )
  }
  const counters: Array<{ label: string; value: number | null }> = [
    { label: 'Saves', value: profile.saves_count },
    { label: 'Comparisons', value: profile.comparisons_count },
    { label: 'Plans completed', value: profile.plans_completed_count },
    { label: 'Reviews', value: profile.reviews_count },
    { label: 'Searches', value: profile.searches_count },
    { label: 'Tool visits', value: profile.tools_visited_count },
    { label: 'Chat messages', value: profile.chat_messages_count },
  ]
  const segments: Array<[string, string | null]> = [
    ['Budget', profile.plan_budget_segment],
    ['Team', profile.plan_team_segment],
    ['Industry', profile.plan_industry_segment],
    ['Skill', profile.plan_skill_segment],
  ]

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">user_id</div>
          <div className="mt-0.5 font-mono text-xs text-zinc-200">{profile.user_id ?? '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Email domain</div>
          <div className="mt-0.5 text-xs text-zinc-200">{profile.email_domain ?? '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">First seen → Last active</div>
          <div className="mt-0.5 text-xs text-zinc-200">
            {fmtDateTime(profile.first_seen_at)} → {fmtDateTime(profile.last_active_at)}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Counters</div>
        <div className="mt-1 flex flex-wrap gap-3">
          {counters.map((c) => (
            <div key={c.label} className="rounded bg-zinc-950 px-2 py-1 text-xs">
              <span className="text-zinc-400">{c.label}:</span>{' '}
              <span className="font-mono text-zinc-200">{c.value ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {segments.some(([, v]) => v) && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Plan segments (latest)</div>
          <div className="mt-1 flex flex-wrap gap-3">
            {segments.map(([label, v]) => (
              <div key={label} className="rounded bg-zinc-950 px-2 py-1 text-xs">
                <span className="text-zinc-400">{label}:</span>{' '}
                <span className="text-emerald-300">{v ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ArrayList label="Existing tools mentioned (vendor gold)" items={profile.existing_tools_history} />
        <ArrayList label="Tools clicked through (affiliate intent)" items={profile.tools_visited_externally} />
        <ArrayList label="AI-chat tool mentions" items={profile.ai_chat_tools_mentioned} />
        <ArrayList label="Tools compared (pairs)" items={profile.tools_compared_with} />
        <ArrayList label="Plan use cases entered" items={profile.plan_use_cases_submitted} />
        <ArrayList label="Reviews submitted for" items={profile.reviews_submitted_for} />
        <ArrayList label="Recent search queries" items={profile.all_search_queries_recent} />
      </div>
    </div>
  )
}

function EventRow({ ev }: { ev: RawEventRow }) {
  const propKeys = Object.keys(ev.properties ?? {})
  return (
    <div className="border-b border-zinc-900 px-3 py-2 hover:bg-zinc-900/30">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-300">{ev.event_name}</span>
          {ev.bot_likely && <span className="text-amber-400" title="bot">🤖</span>}
          {ev.source_kind === 'server' && (
            <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] text-blue-300">server</span>
          )}
        </div>
        <div className="text-[10px] text-zinc-500" title={ev.created_at}>
          {fmtAgo(ev.created_at)}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
        {ev.page_path && <span>{ev.page_path}</span>}
        {ev.device_type && <span>· {ev.device_type}</span>}
        {ev.auth_state && <span>· {ev.auth_state}</span>}
      </div>
      {propKeys.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-300">
            {propKeys.length} properties — expand
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-300">
            {JSON.stringify(ev.properties ?? {}, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export default async function UserTimelinePage({
  params,
}: {
  params: Promise<{ distinct_id: string }>
}) {
  const { distinct_id } = await params
  const distinctId = decodeURIComponent(distinct_id)

  const [events, profile] = await Promise.all([
    getEventsForDistinctId(distinctId, 200),
    getUserProfile(distinctId),
  ])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/insights/events"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ChevronLeft className="h-3 w-3" />
            Raw events
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">User timeline</h1>
        </div>
        <div className="text-xs text-zinc-500">{events.length} events shown</div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">distinct_id</div>
        <div className="mt-1 break-all font-mono text-xs text-zinc-200">{distinctId}</div>
      </div>

      <ProfileSection profile={profile} />

      <div className="rounded-lg border border-zinc-800">
        <div className="border-b border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
          Event timeline (newest first, max 200)
        </div>
        {events.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-zinc-500">
            No events found for this distinct_id.
          </div>
        ) : (
          events.map((ev) => <EventRow key={ev.id} ev={ev} />)
        )}
      </div>
    </div>
  )
}
