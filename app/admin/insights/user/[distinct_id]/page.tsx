// Phase 8.g.8 — per-user timeline at /admin/insights/user/[distinct_id]
// Phase 8.g.10 — added: session-grouped view (30-min idle = new session)
//   + geo from Vercel IP headers + Clarity replay deep-link per session
//   + Mixpanel profile deep-link in header.

import Link from 'next/link'
import { ChevronLeft, ExternalLink, Globe, MapPin, PlayCircle } from 'lucide-react'
import { getEventsForDistinctId, getUserProfile, getUserSessions, type RawEventRow, type UserProfile, type UserSession } from '../../queries'
import { LiveEventsTicker } from '@/components/admin/live-events-ticker'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'User timeline — Admin' }

const MIXPANEL_PROJECT_ID = process.env.MIXPANEL_PROJECT_ID || '4014921'
const MIXPANEL_VIEW_ID = '4511061'
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

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

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
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

function ProfileSection({ profile, latestSession, distinctId }: {
  profile: UserProfile | null
  latestSession: UserSession | null
  distinctId: string
}) {
  const counters: Array<{ label: string; value: number | null }> = [
    { label: 'Saves', value: profile?.saves_count ?? 0 },
    { label: 'Comparisons', value: profile?.comparisons_count ?? 0 },
    { label: 'Plans completed', value: profile?.plans_completed_count ?? 0 },
    { label: 'Reviews', value: profile?.reviews_count ?? 0 },
    { label: 'Searches', value: profile?.searches_count ?? 0 },
    { label: 'Tool visits', value: profile?.tools_visited_count ?? 0 },
    { label: 'Chat messages', value: profile?.chat_messages_count ?? 0 },
  ]
  const segments: Array<[string, string | null]> = [
    ['Budget', profile?.plan_budget_segment ?? null],
    ['Team', profile?.plan_team_segment ?? null],
    ['Industry', profile?.plan_industry_segment ?? null],
    ['Skill', profile?.plan_skill_segment ?? null],
  ]
  const mixpanelUrl = `https://eu.mixpanel.com/project/${MIXPANEL_PROJECT_ID}/view/${MIXPANEL_VIEW_ID}/app/users#user/${encodeURIComponent(distinctId)}`

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">user_id</div>
          <div className="mt-0.5 font-mono text-xs text-zinc-200">{profile?.user_id ?? '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Email domain</div>
          <div className="mt-0.5 text-xs text-zinc-200">{profile?.email_domain ?? '—'}</div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {latestSession && (latestSession.country || latestSession.city) && (
            <div className="flex items-center gap-1.5 rounded bg-zinc-950 px-2 py-1 text-xs">
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-200">
                {[latestSession.city, latestSession.region, latestSession.country].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          <a
            href={mixpanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            title="Open this user's profile in Mixpanel"
          >
            <Globe className="h-3 w-3" />
            Open in Mixpanel
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {profile && (
        <>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">First seen → Last active</div>
            <div className="mt-0.5 text-xs text-zinc-200">
              {fmtDateTime(profile.first_seen_at)} → {fmtDateTime(profile.last_active_at)}
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
        </>
      )}
    </div>
  )
}

function SessionCard({ s }: { s: UserSession }) {
  const clarityUrl = s.clarity_session_id && CLARITY_PROJECT_ID
    ? `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/sessions/${encodeURIComponent(s.clarity_session_id)}`
    : null
  const geo = [s.city, s.region, s.country].filter(Boolean).join(', ')
  const utmString = [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean).join(' · ')
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-200">Session {s.session_num}</span>
            <span className="text-zinc-600"> · </span>
            <span title={fmtDateTime(s.started_at)}>{fmtAgo(s.started_at)}</span>
            <span className="text-zinc-600"> · </span>
            <span className="font-mono">{fmtDuration(s.duration_sec)}</span>
            <span className="text-zinc-600"> · </span>
            <span>{s.event_count} events</span>
            <span className="text-zinc-600"> · </span>
            <span>{s.pages_visited} pages</span>
          </div>
          <div className="mt-1 truncate font-mono text-xs">
            <span className="text-emerald-400">{s.entry_page ?? '—'}</span>
            <span className="text-zinc-600"> → </span>
            <span className="text-zinc-300">{s.exit_page ?? '—'}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
            {s.device_type && <span>📱 {s.device_type}</span>}
            {geo && <span>📍 {geo}</span>}
            {s.referrer && <span className="truncate max-w-[300px]" title={s.referrer}>↪ {s.referrer}</span>}
            {utmString && <span>📣 {utmString}</span>}
          </div>
          {s.event_types.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.event_types.slice(0, 12).map((t) => (
                <span key={t} className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  {t}
                </span>
              ))}
              {s.event_types.length > 12 && (
                <span className="text-[10px] text-zinc-500">+{s.event_types.length - 12}</span>
              )}
            </div>
          )}
        </div>
        {clarityUrl && (
          <a
            href={clarityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 rounded bg-orange-900/30 border border-orange-800 px-2 py-1 text-[11px] text-orange-300 hover:text-orange-200"
            title="Watch this session in Microsoft Clarity"
          >
            <PlayCircle className="h-3 w-3" />
            Watch replay
          </a>
        )}
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

  const [events, profile, sessions] = await Promise.all([
    getEventsForDistinctId(distinctId, 200),
    getUserProfile(distinctId),
    getUserSessions(distinctId, 50),
  ])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/insights/events" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />
            Raw events
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">User timeline</h1>
        </div>
        <div className="text-xs text-zinc-500">
          {sessions.length} sessions · {events.length} events shown
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">distinct_id</div>
        <div className="mt-1 break-all font-mono text-xs text-zinc-200">{distinctId}</div>
      </div>

      <ProfileSection profile={profile} latestSession={sessions[0] ?? null} distinctId={distinctId} />

      {/* Phase 8.g.11.e — live stream filtered to this user only. Watch
          their actions arrive in real time. */}
      <div className="mb-6">
        <LiveEventsTicker filterDistinctId={distinctId} />
      </div>

      {/* ── Sessions ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Sessions (30-min idle = new session)</h2>
          <span className="text-[10px] text-zinc-500">newest first, max 50</span>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-6 text-center text-xs text-zinc-500">
            No sessions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => <SessionCard key={s.session_num} s={s} />)}
          </div>
        )}
      </div>

      {/* ── Flat event log ────────────────────────────── */}
      <div className="rounded-lg border border-zinc-800">
        <div className="border-b border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
          Flat event timeline (newest first, max 200)
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
